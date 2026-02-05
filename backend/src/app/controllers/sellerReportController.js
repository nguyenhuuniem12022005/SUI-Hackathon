import * as sellerReportService from '../services/sellerReportService.js';

function getUserId(req) {
  return req.user?.userId;
}

export async function revenue(req, res) {
  const supplierId = getUserId(req);
  const year = Number(req.query.year) || new Date().getFullYear();

  const data = await sellerReportService.getRevenueByMonth(supplierId, year);
  res.json({
    success: true,
    data,
  });
}

export async function topProducts(req, res) {
  const supplierId = getUserId(req);
  const limit = Number(req.query.limit) || 5;
  const from = req.query.from;
  const to = req.query.to;

  const data = await sellerReportService.getTopProducts(supplierId, { limit, from, to });
  res.json({
    success: true,
    data,
  });
}

export async function completion(req, res) {
  const supplierId = getUserId(req);
  const from = req.query.from;
  const to = req.query.to;

  const data = await sellerReportService.getOrderCompletion(supplierId, { from, to });
  res.json({
    success: true,
    data,
  });
}
