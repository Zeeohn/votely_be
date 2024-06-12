const jwt = require("jsonwebtoken");

const authorize = (req, res, next) => {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader) {
    return res.status(401).json({
      status: false,
      message: "No token provided, login and try again",
    });
  }

  if (!authorizationHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      status: false,
      message: "Invalid token format. It should start with 'Bearer '",
    });
  }

  const token = authorizationHeader.slice(7);

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log(err);
      return res.status(403).json({
        status: false,
        expired: true,
        message: "Failed to authenticate user token",
        error: err,
      });
    }

    req.user = decoded;

    next();
  });
};

module.exports = authorize;
