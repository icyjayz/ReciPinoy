const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const pool = require('../classes/db');
const User = require('../classes/user');


let otp = Math.random();
otp = otp * 1000000;
otp = parseInt(otp);
console.log(otp);

let glEmail, glName, glPassword;

let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    service: 'Gmail',

    auth: {
        user: 'pvblcml@gmail.com',
        pass: 'ikdodeqzumyzrann',
    }

});


exports.indexPage = (req, res) =>{
    try{
        session = req.session;
        if(session.userId){
            res.render('userHome', { title: 'User Home', id: session.userName});
        }
        else{
            console.log('user none...\n');
            res.render('index', { title: 'Home Page'});
        }
    }
    catch(error){
        res.status(500).json({ message: error.message });
    }
    
}

exports.registerPage = (req, res) => {
    res.render('register', { title: 'Register Page'});
}

exports.getRegData = (req,res) => {
    try{
        pool.getConnection((err, conn) => {
       
            if(err){
                console.log(err);
            }
            else{
                console.log('Connected to db in controllers...\n');
                //getting data from reg form
                let user = new User.User();
                user.name = req.body.regNameInp;
                user.email = req.body.regEmailInp;
                user.password = req.body.regPasswordInp;
                glName = user.getUserName();
                glEmail = user.getUserEmail();
                glPassword = user.getUserPassword();
                let rePassword = req.body.regRePasswordInp;
                //let categ = 'admin';
                if(user.password !== rePassword){
                    //alert('Passwords does not match');
                    res.redirect('/register');    
                }
                else{
                    conn.query('SELECT * FROM users WHERE user_email = ?', [user.email], (err, row) => {
                        if(err){
                            console.log(err, '\n');
                            conn.release();
    
                        }
                        else if(row.length > 0)
                        {
                            console.log('email is already registered!\n');
                            conn.release();
                            res.redirect('/register');
                        }
                        else{
                            // send mail with defined transport object
                            var mailOptions = {
                                from: 'pvblcml@gmail.com',
                                to: user.getUserEmail(),
                                subject: 'ReciPinoy Email Verification',
                                text: 'Your OTP is: ' + otp.toString()
                                
                            };

                            transporter.sendMail(mailOptions, (error, info) => {
                                if (error) {
                                    console.log(error);
                                }
                                console.log('Message sent: %s', info.messageId);
                                console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));

                                res.redirect('/verify');
                            });

                          
                        }
                    })
                    
                }
    
                
            
            }
        });
    }
    catch(error){
        res.json({ message: error.message });
    }
    
}
exports.loginPage = (req, res) => {
    res.render('login', { title: 'Login Page'});
}

exports.getLoginData = (req, res) => {
    try{
        pool.getConnection((err, conn) => {
            if(err){
                console.log(err);
                conn.release();
            }
            else{
                let user = new User.UserLogin();
                user.email = req.body.loginEmailInp;
                user.password = req.body.loginPasswordInp;
                //let email = req.body.loginEmailInp;
                //let password = req.body.loginPasswordInp;
                conn.query('SELECT * FROM users WHERE user_email = ?', [user.getLoginEmail()], (err, result) =>{
                    if(err){
                        console.log(err, '\n');
                        conn.release();
                    }
                    else{
                        if(result.length > 0){
                            bcrypt.compare(user.getLoginPassword(), result[0].user_password, (err, row) => {
                                if(row){
                                    session = req.session;
                                    session.userId = result[0].user_id;
                                    session.userName = result[0].user_name;
                                    console.log(req.session, '\n');
                                    conn.release();
                                    res.redirect('/home');
                                    
                                }
                                else{
                                    // res.send({ message: 'invalid credentials!!!'});
                                    console.log('Invalid credentials!\n');
                                    conn.release();
                                    res.redirect('/login');
                                }
                            })
                        }
                    
                    }
                })
            }
        })
    }
    catch(error){
        res.status(500).json({ message: error.message });
    }

  
}
exports.userLogout = (req,res) => {
    try{
        if(req.session.userId){
            req.session.destroy();
            console.log('session user destroy');
            console.log(req.session, '\n');
            //conn.destroy();
            res.redirect('/');
            
        }
    }
    catch(error){
        res.status(500).json({ message: error.message });

    }
    
}

exports.userHome = (req,res) => {
    try{
        session = req.session;
        if(session.userId){
            res.render('userHome', {title: 'User Homepage', id: session.userName});
        }
    }
    catch(error){
        res.status(500).json({ message: error.message });

    }
    
}
exports.otpPage = (req, res) => {
    try{
        res.render('otpVerify', { title: 'Verify your email',  msg: ''});
    }
    catch(error){
        res.status(500).json({ message: error.message});
    }
}

exports.userVerified = async(req,res) => {
    try{  
        if (req.body.otpInp == otp) {
            console.log('successfully registered!\n');
            //let user = new User();
            //console.log(user.getUserEmail());
            bcrypt.genSalt(10, async (err, salt) => {
                await bcrypt.hash(glPassword, salt, (err, hash) =>{
                    const hashed = hash;
                    pool.getConnection((err, conn) => {
                        conn.query('INSERT INTO users(user_name, user_email, user_password) VALUES (?, ?, ?)', [glName, glEmail, hashed], (err, result) => {
                            if(err){
                                console.log(err,'\n');
                                conn.release();
                            }
                            else{
                                console.log('user inserted! \n');
                                conn.release();
                                res.redirect('/login');
                            }
                        })
                    })
                })
            })
            
        }
        else {
            res.render('otpVerify', { title: 'Verify your email', msg: 'otp is incorrect'});
        }
    }
    catch(error){
        res.status(500).json({ message: error.message });
    }
}