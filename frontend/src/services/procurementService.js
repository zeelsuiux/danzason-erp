import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': '2ee062fd20e15a2da9c359fac339da2c24396001c9d748df0ef4c6a1d6a776a6',
    'Authorization': 'Bearer 2ee062fd20e15a2da9c359fac339da2c24396001c9d748df0ef4c6a1d6a776a6',
  },
});

// Interceptor to handle standardized responses
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.message || 'API request failed';
    return Promise.reject(new Error(message));
  }
);

export const ft = {
  // Categories
  getCategories: (params) => api.get('/purchase/categories', { params }),
  createCategory: (data) => api.post('/purchase/categories', data),
  updateCategory: (id, data) => api.put(`/purchase/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/purchase/categories/${id}`),

  // Suppliers
  getSuppliers: (params) => api.get('/purchase/suppliers', { params }),
  getSupplierById: (id) => api.get(`/purchase/suppliers/${id}`),
  getSupplierOverview: (id) => api.get(`/purchase/suppliers/${id}/overview`),
  createSupplier: (data) => api.post('/purchase/suppliers', data),
  updateSupplier: (id, data) => api.put(`/purchase/suppliers/${id}`, data),

  // Inquiries / RFQs
  getInquiries: (params) => api.get('/purchase/inquiries', { params }),
  getInquiryById: (id) => api.get(`/purchase/inquiries/${id}`),
  createInquiry: (data) => api.post('/purchase/inquiries', data),
  updateInquiry: (id, data) => api.put(`/purchase/inquiries/${id}`, data),
  deleteInquiry: (id) => api.delete(`/purchase/inquiries/${id}`),
  updateSupplierQuotationStatus: (id, supplierId, data) =>
    api.put(`/purchase/inquiries/${id}/suppliers/${supplierId}/status`, data),
  awardQuotationAndGeneratePo: (id, data) =>
    api.post(`/purchase/inquiries/${id}/award-po`, data),

  // Requisitions (PR)
  getRequisitions: (params) => api.get('/purchase/requisitions', { params }),
  createRequisition: (data) => api.post('/purchase/requisitions', data),
  approveRequisition: (id, data) => api.put(`/purchase/requisitions/${id}/approve`, data),

  // Orders (PO)
  getNextOrderNumber: () => api.get('/purchase/orders/next-number'),
  getOrders: (params) => api.get('/purchase/orders', { params }),
  getOrderById: (id) => api.get(`/purchase/orders/${id}`),
  createOrder: (data) => api.post('/purchase/orders', data),
  updateOrder: (id, data) => api.put(`/purchase/orders/${id}`, data),

  // Goods Receipts (GRN)
  getGrns: (params) => api.get('/purchase/grns', { params }),
  getGrnById: (id) => api.get(`/purchase/grns/${id}`),
  createGrn: (data) => api.post('/purchase/grns', data),
  postGrnToStock: (id, data) => api.put(`/purchase/grns/${id}/post-to-stock`, data),

  // Invoices
  getNextBillNumber: () => api.get('/purchase/invoices/next-number'),
  getInvoices: (params) => api.get('/purchase/invoices', { params }),
  getInvoiceById: (id) => api.get(`/purchase/invoices/${id}`),
  createInvoice: (data) => api.post('/purchase/invoices', data),
  updateInvoice: (id, data) => api.put(`/purchase/invoices/${id}`, data),
  updateInvoiceDueDate: (id, due_date) => api.put(`/purchase/invoices/${id}/due-date`, { due_date }),
  recordInvoicePayment: (id, data) => api.post(`/purchase/invoices/${id}/payment`, data),

  // Returns
  getNextReturnNumber: () => api.get('/purchase/returns/next-number'),
  getReturns: (params) => api.get('/purchase/returns', { params }),
  getReturnById: (id) => api.get(`/purchase/returns/${id}`),
  createReturn: (data) => api.post('/purchase/returns', data),
  updateReturn: (id, data) => api.put(`/purchase/returns/${id}`, data),
};

export const St = {
  getWarehouses: (params) => api.get('/purchase/warehouses', { params }),
  getWarehouseById: (id) => api.get(`/purchase/warehouses/${id}`),
  createWarehouse: (data) => api.post('/purchase/warehouses', data),
  updateWarehouse: (id, data) => api.put(`/purchase/warehouses/${id}`, data),
  deleteWarehouse: (id) => api.delete(`/purchase/warehouses/${id}`),
  setDefaultWarehouse: (id) => api.put(`/purchase/warehouses/${id}/set-default`),
  toggleWarehouseStatus: (id) => api.put(`/purchase/warehouses/${id}/toggle-status`),
  // Channel Quantity Pricing Rules
  getPricingRules: () => api.get('/purchase/pricing-rules'),
  savePricingRules: (data) => api.put('/purchase/pricing-rules', data),
  calculateChannelPrice: (data) => api.post('/purchase/calculate-price', data),
};

export const productApi = {
  getProducts: (params) => api.get('/products', { params }),
  getProductById: (id) => api.get(`/products/${id}`),
  getProductLedger: (id, params) => api.get(`/products/${id}/ledger`, { params }),
};

export const Dt = productApi;

// Sales & Distribution Service
export const salesApi = {
  // Customers
  getCustomers: (params) => api.get('/sales/customers', { params }),
  getCustomerById: (id) => api.get(`/sales/customers/${id}`),
  getCustomerOverview: (id) => api.get(`/sales/customers/${id}/overview`),
  createCustomer: (data) => api.post('/sales/customers', data),
  updateCustomer: (id, data) => api.put(`/sales/customers/${id}`, data),
  deleteCustomer: (id) => api.delete(`/sales/customers/${id}`),

  // Orders
  getOrders: (params) => api.get('/sales/orders', { params }),
  getOrderById: (id) => api.get(`/sales/orders/${id}`),
  createOrder: (data) => api.post('/sales/orders', data),
  updateOrder: (id, data) => api.put(`/sales/orders/${id}`, data),
  updateOrderStatus: (id, data) => api.put(`/sales/orders/${id}/status`, data),

  // Invoices
  getInvoices: (params) => api.get('/sales/invoices', { params }),
  getInvoiceById: (id) => api.get(`/sales/invoices/${id}`),
  createDirectInvoice: (data) => api.post('/sales/invoices', data),
  createInvoiceFromOrder: (data) => api.post('/sales/invoices/from-order', data),
  updateInvoice: (id, data) => api.put(`/sales/invoices/${id}`, data),
  updateInvoiceDueDate: (id, due_date) => api.put(`/sales/invoices/${id}/due-date`, { due_date }),
  recordInvoicePayment: (id, data) => api.post(`/sales/invoices/${id}/payment`, data),

  // Sales Returns
  getSalesReturns: (params) => api.get('/sales/returns', { params }),
  getSalesReturnById: (id) => api.get(`/sales/returns/${id}`),
  createSalesReturn: (data) => api.post('/sales/returns', data),

  // Visitor Storefront
  placeVisitorOrder: (data) => api.post('/sales/visitor-order', data),
  trackVisitorOrder: (ref) => api.get(`/sales/track-order/${encodeURIComponent(ref)}`),

  // Applications & CRM Order Requests
  getApplications: (params) => api.get('/sales/applications', { params }),
  getApplicationById: (id) => api.get(`/sales/applications/${id}`),
  updateApplicationStatus: (id, data) => api.put(`/sales/applications/${id}/status`, data),
  getOrderRequests: (params) => api.get('/admin/order-request', { params }),
  getOrderRequestById: (id) => api.get(`/admin/order-request/${id}`),
  getCrmUsers: (params) => api.get('/admin/users/list', { params }),
};

// Raw Materials & Manufacturing Job Work Service
export const rawMaterialApi = {
  getRawMaterials: (params) => api.get('/raw-materials', { params }),
  getRawMaterialById: (id) => api.get(`/raw-materials/${id}`),
  createRawMaterial: (data) => api.post('/raw-materials', data),
  updateRawMaterial: (id, data) => api.put(`/raw-materials/${id}`, data),
  deleteRawMaterial: (id) => api.delete(`/raw-materials/${id}`),
  getRawMaterialLedger: (id, params) => api.get(`/raw-materials/${id}/ledger`, { params }),
  getSupplierBalances: () => api.get('/raw-materials/suppliers/balances'),
  getContractorOverview: (id) => api.get(`/raw-materials/contractors/${id}/overview`),
  
  // Manufacturing Workflow
  quickCompleteJobWork: (data) => api.post('/raw-materials/manufacturing/quick-complete', data),
  issueMaterial: (data) => api.post('/raw-materials/manufacturing/issue', data),
  recordConsumption: (data) => api.post('/raw-materials/manufacturing/consume', data),
  receiveFinishedGoods: (data) => api.post('/raw-materials/manufacturing/receive-finished', data),
  requestReturn: (data) => api.post('/raw-materials/manufacturing/return-request', data),
  dispatchReturn: (data) => api.post('/raw-materials/manufacturing/return-dispatch', data),
  receiveReturn: (data) => api.post('/raw-materials/manufacturing/return-receive', data),
};

// Clean semantic exports
export const visitorApi = {
  placeOrder: (data) => api.post('/sales/visitor-order', data),
  trackOrder: (ref) => api.get(`/sales/track-order/${encodeURIComponent(ref)}`),
};
export const purchaseApi = ft;
export const warehouseApi = St;

export default ft;
