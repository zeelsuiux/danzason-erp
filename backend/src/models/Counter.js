const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
  },
  seq: {
    type: Number,
    default: 0,
  },
});

const Counter = mongoose.model('Counter', counterSchema);

/**
 * Atomically generates the next sequence number for a given entity key.
 * If counter is not initialized, inspects existing records to resume from max sequence.
 * @param {string} sequenceName e.g. 'so_2026', 'sales_inv_2026'
 * @param {string} [modelName] e.g. 'SalesOrder'
 * @param {string} [fieldName] e.g. 'so_number'
 * @returns {Promise<number>}
 */
const getNextSequence = async (sequenceName, modelName, fieldName) => {
  let counter = await Counter.findById(sequenceName);
  
  if (!counter) {
    let initialSeq = 0;
    if (modelName && fieldName) {
      try {
        const Model = mongoose.model(modelName);
        const docs = await Model.find(
          { [fieldName]: { $exists: true, $ne: '' } },
          { [fieldName]: 1 }
        ).lean();
        
        docs.forEach((doc) => {
          const val = String(doc[fieldName] || '');
          const match = val.match(/(\d+)$/);
          if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > initialSeq) {
              initialSeq = num;
            }
          }
        });
      } catch (err) {
        initialSeq = 0;
      }
    }

    try {
      await Counter.findByIdAndUpdate(
        sequenceName,
        { $setOnInsert: { seq: initialSeq } },
        { upsert: true }
      );
    } catch (e) {
      // Ignore if inserted concurrently
    }
  }

  const result = await Counter.findByIdAndUpdate(
    sequenceName,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return result.seq;
};

module.exports = {
  Counter,
  getNextSequence,
};
