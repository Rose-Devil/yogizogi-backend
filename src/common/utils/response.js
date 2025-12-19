// 성공 응답
exports.success = (res, data = null, message = "Success", statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

// 에러 응답
exports.error = (res, message = "Error", statusCode = 500, details = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    error: details,
  });
};

// 페이지네이션 응답
exports.paginated = (res, data, paination, message = "Success") => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      total: paination.total,
      page: paination.page,
      limit: paination.limit,
      totalPages: Math.ceil(paination.total / paination.limit),
    },
  });
};
