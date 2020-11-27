var jwt = require('jsonwebtoken');
var secret = '82e4e438a0705fabf61f9854e3b575af'

exports.authenticateJWT = (req, res, next) => {

 

    const authHeader = req.headers.authorization;

    console.log(authHeader);

    if (authHeader) {
        const token = authHeader.split(' ')[1];

        jwt.verify(token, secret, (err, user) => {
            if (err) {
                return res.sendStatus(403);
            }

            req.user = user;
            next();
        });
    } else {
        res.sendStatus(401);
    }
};