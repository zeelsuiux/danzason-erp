const TargetGoal = require('../models/TargetGoal');

/**
 * Automatically update matching Target Goals whenever transactions take place in the ERP
 * @param {Object} params
 * @param {string} params.eventType 'SALES_ORDER' | 'SALES_INVOICE' | 'PURCHASE_ORDER' | 'PURCHASE_INVOICE' | 'PRODUCTION_OUTPUT' | 'COLLECTION_PAYMENT'
 * @param {number} [params.amount] Transaction amount in INR
 * @param {number} [params.count] Order or document count (default 1)
 * @param {number} [params.units] Output units or volume (PCS, KG)
 * @param {string} [params.memberId] ObjectId of the team member who created or owns the transaction
 * @param {string} [params.memberName] Name of the team member
 * @param {string} [params.department] Department name
 * @param {string} [params.notes] Reference notes e.g. "SO-2026-0042 confirmed"
 */
async function trackGoalProgressEvent({
  eventType,
  amount = 0,
  count = 1,
  units = 0,
  memberId = null,
  memberName = '',
  department = '',
  notes = '',
}) {
  try {
    const query = {
      status: { $nin: ['closed', 'missed'] },
    };

    if (eventType === 'SALES_ORDER') {
      query.category = 'sales';
      query.metric_type = 'order_count';
    } else if (eventType === 'SALES_INVOICE') {
      query.category = 'sales';
      query.metric_type = { $in: ['revenue_amount', 'order_count'] };
    } else if (eventType === 'PURCHASE_ORDER') {
      query.category = 'procurement';
      query.metric_type = { $in: ['order_count', 'revenue_amount'] };
    } else if (eventType === 'PURCHASE_INVOICE') {
      query.category = 'procurement';
      query.metric_type = 'revenue_amount';
    } else if (eventType === 'PRODUCTION_OUTPUT') {
      query.category = 'production';
      query.metric_type = { $in: ['unit_volume', 'order_count'] };
    } else if (eventType === 'COLLECTION_PAYMENT') {
      query.category = 'finance';
      query.metric_type = { $in: ['collection_amount', 'revenue_amount'] };
    } else {
      return;
    }

    const matchingGoals = await TargetGoal.find(query);

    for (const goal of matchingGoals) {
      // Check assignment scope
      let isScopeMatch = false;
      if (goal.target_level === 'company_wide') {
        isScopeMatch = true;
      } else if (goal.target_level === 'department') {
        if (!department || goal.department.toLowerCase() === department.toLowerCase()) {
          isScopeMatch = true;
        }
      } else if (goal.target_level === 'individual') {
        if (memberId && String(goal.assigned_to) === String(memberId)) {
          isScopeMatch = true;
        } else if (
          memberName &&
          goal.assignee_name &&
          goal.assignee_name.toLowerCase().includes(memberName.toLowerCase())
        ) {
          isScopeMatch = true;
        } else if (!goal.assigned_to) {
          // Unassigned individual goals match general flow
          isScopeMatch = true;
        }
      }

      if (!isScopeMatch) continue;

      const prevVal = goal.actual_value || 0;
      let increment = 0;

      if (goal.metric_type === 'order_count') {
        increment = count || 1;
      } else if (
        goal.metric_type === 'revenue_amount' ||
        goal.metric_type === 'collection_amount'
      ) {
        increment = amount || 0;
      } else if (goal.metric_type === 'unit_volume') {
        increment = units || count || 0;
      }

      if (increment > 0) {
        goal.actual_value = prevVal + increment;

        // Recalculate achievement %
        if (goal.target_value > 0) {
          goal.achievement_pct =
            Math.round((goal.actual_value / goal.target_value) * 100 * 10) / 10;
        }

        // Status update
        if (goal.achievement_pct >= 100) {
          goal.status = 'achieved';
        } else if (goal.achievement_pct >= 75) {
          goal.status = 'on_track';
        } else if (goal.achievement_pct >= 40) {
          goal.status = 'active';
        } else {
          goal.status = 'behind';
        }

        // Earned incentive
        if (goal.achievement_pct >= 100 && goal.incentive_value > 0) {
          if (goal.incentive_type === 'percentage') {
            goal.earned_incentive = Math.round(
              (goal.actual_value * goal.incentive_value) / 100
            );
          } else if (goal.incentive_type === 'fixed_bonus') {
            goal.earned_incentive = goal.incentive_value;
          }
        }

        // Append auto progress note
        const noteDetail = notes || `Auto-updated on ${eventType} (+${increment} ${goal.metric_unit})`;
        goal.progress_notes.push({
          note: `[ERP Auto-Sync]: ${noteDetail}`,
          recorded_by: memberName || 'System ERP',
          recorded_at: new Date(),
          previous_value: prevVal,
          new_value: goal.actual_value,
        });

        await goal.save();
      }
    }
  } catch (error) {
    console.warn('⚠️ [targetGoalTracker] Failed to auto-update target goals:', error.message);
  }
}

module.exports = {
  trackGoalProgressEvent,
};
