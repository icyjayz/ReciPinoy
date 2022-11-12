const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const pool = require('../classes/db');
const User = require('../classes/user');
const randToken = require('rand-token');
const Recipe = require('../classes/recipe');
const { json } = require('express');




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
        pass: 'zfaugmmgmahgwamg',
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
            pool.getConnection((err, conn) =>{
                if(err){
                    console.log(err);
                }
                else{
                    conn.query('SELECT * FROM rec ORDER BY rec_id DESC LIMIT 6', (err, recs) => {
                        if(err){
                            console.log(err);
                        }
                        else{
                            let msg = req.flash('msg');
                            res.render('index', { title: 'Home Page', msg, recs: recs, id: ''});
                        }
                    })
                }
            })
            
        }
    }
    catch(error){
        res.status(500).json({ message: error.message });
    }
    
}

exports.registerPage = (req, res) => {
    let msg = req.flash('msg');
    res.render('register', { title: 'Register Page', msg, id: ''});
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
                if(user.getUserPassword().length < 8){
                    req.flash('msg', 'Passwords should be at least 8 characters!');
                    res.redirect('/register'); 
                }
                if(user.getUserPassword() !== rePassword){
                    req.flash('msg', 'Passwords does not match!');
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
                            req.flash('msg', 'Email is already registered!');
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
    let msg = req.flash('msg');
    res.render('login', { title: 'Login Page', msg, id: ''});
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
                                    conn.release();
                                    req.flash('msg', 'Invalid credentials!');
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
        let msg = req.flash('msg');
        res.render('otpVerify', { title: 'Verify your email',  msg});
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
                                req.flash('msg', 'Email verified! You can now login!');
                                res.redirect('/login');
                            }
                        })
                    })
                })
            })
            
        }
        else {
            req.flash('msg', 'Incorrect OTP! Try again!');
            res.redirect('/verify');
            //res.render('otpVerify', { title: 'Verify your email', msg: 'otp is incorrect'});
        }
    }
    catch(error){
        res.status(500).json({ message: error.message });
    }
}

exports.userForgotPwd = (req, res) => {
    try {
        let msg = req.flash('msg');
        res.render('forgotPwd', { title: 'Password Reset', msg});
    } catch (error) {
        res.status(500).json({ message: error.message});
    }
}

exports.userSendPwdEmail = (req, res) => {
    try {
        let email = req.body.fpEmail;
        pool.getConnection((err, conn) =>{
            if(err){
                console.log(err, '\n');
                conn.release();
            }
            else{
                conn.query('SELECT * FROM users WHERE user_email = ?', [email], (err, user) => {
                    if(err){
                        console.log(err, '\n');
                        conn.release();
                        res.redirect('/');
                    }
                    else if(user.length == 0){
                        req.flash('msg', 'Email not found!');
                        res.redirect('/forgot-password');
                    }
                    else{
                        let userEmail = user[0].user_email;
                        let token = randToken.generate(20);
                        var mailOptions = {
                            from: 'pvblcml@gmail.com',
                            to: userEmail,
                            subject: 'ReciPinoy Reset Password Link',
                            html: '<p>You requested for reset password, kindly use this <a href="http://localhost:3000/reset-password?token=' + token + '"><strong>link</strong></a> to reset your password</p>'
                            
                        };
                        transporter.sendMail(mailOptions, (error, info) => {
                            if (error) {
                                console.log(error);
                                conn.release();
                            }
                            console.log('Message sent: %s', info.messageId);
                            console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
                            
                        });
                        conn.query('UPDATE users SET user_token = ? WHERE user_email = ?', [token, userEmail], (err, row) =>{
                            if(err){
                                console.log(err, '\n');
                                conn.release();
                            }
                            else{
                                conn.release();
                                req.flash('msg', 'Email for password reset is sent!');
                               // console.log('Reset password email is sent...\n');
                                res.redirect('/');
                            }
                        })
                    }
                })
            }
        })
    } catch (error) {
        res.status(500).json({ message: error.message});
    }
}

exports.userResetPwd = (req, res) =>{
    try {
        let msg = req.flash('msg');
        res.render('resetPwd', { title: 'Password Reset', token: req.query.token, msg});
    } catch (error) {
        res.status(500).json({ message: error.message});
    }
}

exports.userUpdatePwd = (req, res) =>{
    try {
        let token = req.body.tokenInp;
        let password = req.body.newPwdInp;
        let passwordConf = req.body.newPwdInpConf;
        if(password !== passwordConf){
            req.flash('msg', 'Passwords does not match!');
            //alert('Passwords does not match');
            res.redirect('http://localhost:3000/reset-password?token=' + token + '');    
        }
        else{
            pool.getConnection((err, conn) =>{
                if(err){
                    console.log(err, '\n');
                }
                else{
                    conn.query('SELECT * FROM users WHERE user_token = ?', [token], (err, user) => {
                        if(err){
                            console.log(err, '\n');
                        }
                        else{
                            bcrypt.genSalt(10, async (err, salt) => {
                                await bcrypt.hash(password, salt, (err, hash) =>{
                                    const hashed = hash;
                                    conn.query('UPDATE users SET user_password = ? WHERE user_token = ?', [hashed, token], (err, result) => {
                                        if(err){
                                            console.log(err,'\n');
                                            conn.release();
                                        }
                                        else{
                                            //console.log('password updated! \n');
                                            req.flash('msg', 'You can now login with your new password!');
                                            conn.release();
                                            res.redirect('/login');
                                        }
                                    })
                                })
                            })
                        }
                    })
                }
            })
        }
       
    } catch (error) {
        res.status(500).json({ message: error.message});
    }
}

exports.userSearch = (req, res) => {
    try {
        pool.getConnection((err, conn) =>{
            if(err){
                console.log(err, '\n');
            }
            else{
                let search = req.body.searchInp;
                conn.query('SELECT * FROM rec WHERE rec_name LIKE ?', ['%' + search + '%'], (err, result) => {
                    if(err){
                        console.log(err, '\n');
                    }
                    else{
                        session = req.session;
                        if(session.userId){
                            res.render('userSearchResults', {title: 'Search Results', recs: result, id: session.userName});
                        }
                        else{
                            res.render('userSearchResults', {title: 'Search Results', recs: result, id: ''});
                        }
                        
                    }   
                })
            }
        })
    } catch (error) {
        res.status(500).json({ message: error.message});
    }
}

exports.userRecipeView = (req, res) => {
    try {
        pool.getConnection((err, conn) => {
            if(err){
                console.log('error in user recipes...\n');
            }
            else{
                let rId = req.params.id;
                conn.query('SELECT * FROM rec WHERE rec_id = ?',[rId], (err, recs) => {
                    if(err){
                        console.log('cannot fetch recipes in db...\n');
                    }
                    else{
                        let regexQuant = /[+-]?\d+(\.\d+)?/g;
                        let regexStr = /\b(\w+)\b/g;
                        let finalStr = '';
                        let quantArr = [];
                        let recIngs = [];
                        let ingStringArr = [];
                        let ingI = [];
                        let insArr = [];
                        let ingIStr = '';
                        let ingStr = '';
                        let qStr = 'SELECT recing.*, ing_name FROM `recing` INNER JOIN ing ON recing.ingId=ing.ing_id WHERE recing.recId = ?';
                        function getIngs(id){
                            return new Promise((resolve, reject) => {
                                conn.query(qStr, [id], (err, ings) => {
                                    if(err){
                                        console.log(err, '\n');
                                    }
                                    else{
                                        ings.forEach(ing => {
                                            let ingq = ing.ingQuant;
                                            let ingu = ing.ingUnit;
                                            let ingi = ing.ingIns;
                                            
                                            if(!ing.ingQuant){
                                                ingq = 0;
                                            }
                                            if(!ing.ingUnit){
                                                ingu = '';
                                            }
                                            if(!ing.ingIns){
                                                ingi = '';
                                            }
                                            let temp = ingq + ' ' + ingu + ' ' + ing.ing_name;
                                            let ii = ' '+ ingi;
                                            ingStringArr.push(temp);
                                            ingI.push(ii);
                                        });
                                        ingStr = ingStringArr.join('/');
                                        ingIStr = ingI.join('/');
                                        let strConcat = ingStr.concat('*', ingIStr);
                                        ingStringArr = [];
                                        ingI = []; 
                                        resolve(strConcat);
                                    }
                                })
                            })
                        }
                        
                        async function getAllRecIng(r){
                            for(id of r){
                                ingStr = await getIngs(id.rec_id);
                                let strArr = ingStr.split('*');
                                let qui = strArr[0]
                                let ins = strArr[1];
                                insArr = ins.split('/');
                                let ingArr = qui.split('/');
                                for (const i of ingArr) {
                                    let quantNum = i.match(regexQuant);
                                    let iStr = i.match(regexStr); 
                                    if(Array.isArray(quantNum)){
                                        quantArr.push(quantNum[0]);
                                    }else{
                                        quantArr.push(quantNum);
                                    }
                                    for (let index = 0; index < iStr.length; index++) {
                                        const element = iStr[index];
                                        if (isNaN(element)) {
                                            finalStr += ' ' + element;
                                        }
                                    }
                                    recIngs.push(finalStr);
                                    finalStr = '';
                                }
                            }
                            let msg = req.flash('msg');
                            session = req.session;
                            let isRated = false;
                            let isSaved = false;
                            let isMeal = false;
                            // let ratedArr = [];
                            if(session.userId){
                                conn.query('SELECT user_ratedRecs, user_Saved, user_mealPlan FROM users WHERE user_id = ?', [session.userId], (err, rated) => {
                                    if(err){
                                        console.log(err);
                                    }
                                    else{
                                        let getRated = rated[0].user_ratedRecs;
                                        let getSaved = rated[0].user_Saved;
                                        let getMeal = rated[0].user_mealPlan;
                                        if(getRated){
                                            let ratedArr = getRated.split('/');
                                            if(ratedArr.includes(rId)){
                                                isRated = true;
                                            }
                                        }
                                        if(getSaved){
                                            let savedArr = getSaved.split('/');
                                            if(savedArr.includes(rId)){
                                                isSaved= true;
                                                console.log('isSaved');
                                            }
                                        }
                                        if(getMeal){
                                            let mealArr = getMeal.split('/');
                                            if(mealArr.includes(rId)){
                                                isMeal= true;
                                                console.log('isMeal');
                                            }
                                        }
                                        res.render('userRecipeView', { recs: recs, recIngs: recIngs, ins: insArr, quantArr: quantArr, msg, id: session.userName, isRated: isRated, isSaved: isSaved, isMeal: isMeal});
                                    }
                                })
                                

                            }
                            else{
                                res.render('userRecipeView', { recs: recs, recIngs: recIngs, ins: insArr, quantArr: quantArr, msg, id: '', isRated: isRated, isSaved: '', isMeal: ''});
                            }
                            
                        }
                        getAllRecIng(recs);
                    }
                })
                         
            }
        })
    } catch (error) {
        res.status(500).json({ message: error.message});
    }
}

exports.UnsavedButton = (req, res) =>{
    try{
        session = req.session;
        if(session.userId){
            pool.getConnection((err, conn) => {
                let id = req.params.id;
                conn.query('DELETE FROM saved where rec_id =?', [id], (err, result) => {
                    if(err){
                        console.log('not deleted');
                        res.redirect('/recipes/' + id); 
                        conn.release();
                    }
                    else{
                        conn.query('DELETE FROM saved_recing WHERE rec_id =?', [id]);
                        conn.query('SELECT user_Saved FROM users WHERE user_id = ?', [session.userId], (err, saved) => {
                            if(err){
                                console.log(err);
                            }
                            else{
                                let getSaved = saved[0].user_Saved;
                                if(getSaved){
                                    let savedArr = getSaved.split('/');
                                    if (savedArr.includes(id)) {
                                        for(let i = 0; i < savedArr.length; i++){ 
                                            if (savedArr[i] === id) { 
                                                savedArr.splice(i, 1); 
                                            }
                                        }
                                    }
                                    conn.query('UPDATE users SET user_Saved = ?', [savedArr]);
                                    console.log(id);
                                    console.log('deleted');
                                }
                            }
                        })
                        conn.release();
                        req.flash('msg', 'Recipe successfully unsaved!');
                        res.redirect('/recipes/' + id); 
                    }
                })
            })
        }
    }
    catch(error){
        res.status(500).json({ message: error.message });

    }
}

exports.userRecommendRecipe = (req,res) =>{
try {
pool.getConnection((err, conn) => {
    if(err){
        console.log(err);
    }
    else{
        let recomm = new Recipe.Recomm();
        recomm.ings = JSON.parse(req.body.ingsVal);
        let exIngNum = req.body.exIngNum;
        //to get recipes based on ing
        let counts = {};
        let finalRids = [];
        let recIds = []; 
        let ingsId = [];
        let recImage = [];
        let recId = [];
        let recName = [];
        let userRecIds = [];
        
        function getUserFilter(id) {
            return new Promise((resolve, reject) => {
                conn.query('SELECT user_allergy, user_restrict FROM users WHERE user_id = ?', [id], (err, row) =>{
                    if (err) {
                        console.log(err);
                    } 
                    else{
                        let ua = row[0].user_allergy;
                        let ur = row[0].user_restrict;
                        if(ua){
                            recomm.allergy = ua;
                        } 
                        if(ur){
                            recomm.restrict = ur;
                        }
                        console.log('ua: ', ua);
                        console.log('ur: ', ur);
                        resolve('got');
                    }
                })
            })
            
        }

        function getFilteredIngIds(aArr, rArr) {
            return new Promise((resolve, reject) => {
                conn.query('SELECT * FROM ing', (err, ing) => {
                    if(err){
                        console.log(err);
                    }
                    else{
                        let idStr = ''
                        let count = 0;
                        for (let index = 0; index < ing.length; index++) {
                            const allergy = ing[index].ing_allergy;
                            const restrict = ing[index].ing_restrict;
                            const id = ing[index].ing_id;
                            if(aArr.length > 0){
                                aArr.forEach(a => {
                                    if(allergy.includes(a)){
                                        idStr += id + '/';
                                    }
                                });
                            }
                            if (rArr.length > 0) {
                                rArr.forEach(r => {
                                    if(restrict.includes(r)){
                                        if(idStr.includes(id)){
                                            count += 1;
                                        }
                                        else{
                                            idStr += id + '/';
                                        }
                                    }
                                });
                            }
                        }
                        resolve(idStr);
                    }
                })
            })
        }
        
        function getUserRecIds(id) {
            return new Promise((resolve, reject) => {
                conn.query('SELECT recId FROM recing WHERE ingId = ?', [id], (err, ids) => {
                    if(err){
                        console.log(err);
                    }
                    else{
                        let count = 0;
                        for (let index = 0; index < ids.length; index++) {
                            const element = ids[index].recId;
                            if(userRecIds.includes(element)){
                                count += 1;
                            }
                            else{
                                userRecIds.push(element);
                            }
                        }
                        resolve();
                    }
                })
            })
        }

        function getIngId(ings) {
            return new Promise((resolve, reject) => {
                conn.query('SELECT * FROM ing WHERE ing_name = ?', [ings], (err, iid) =>{
                    if(err){
                        console.log(err);
                    }
                    else if (iid[0]) {
                        let id = iid[0].ing_id;
                        resolve(id);
                    }
                    else{
                        req.flash('msg', 'There is an invalid ingredient! Look for misspelled and try again!');
                        res.redirect('/recommend');
                    }
                })
            })
        }
        function getRecIds(ingsId) {
            return new Promise((resolve, reject) => {
                conn.query('SELECT recId FROM recing WHERE ingId = ? LIMIT 35', [ingsId], (err, recs) =>{
                    if(err){
                        console.log(err);
                    }
                    else{
                        for (let index = 0; index < recs.length; index++) {
                            const element = recs[index].recId;
                            recIds.push(element);
                        }
                        resolve();
                    }  
                })
            })
        }
        function toFindDuplicates(arr){
            for(let i =0; i < arr.length; i++){ 
                if (counts[arr[i]]){
                counts[arr[i]] += 1
                } else {
                counts[arr[i]] = 1
                }
                }
                console.log(counts)
        }
        function getRecDetails(id) {
            return new Promise((resolve, reject) => {
                conn.query('SELECT * FROM rec WHERE rec_id = ?', [id], (err, recs) =>{
                    if(err){
                        console.log(err);
                    }
                    else{
                        let id = recs[0].rec_id;
                        let name = recs[0].rec_name;
                        let image = recs[0].rec_image;
                        //console.log(id);
                        recName.push(name);
                        recId.push(id);
                        recImage.push(image);
                        resolve();
                    }
                })
            })
        }
        async function getRecommRec() {
            let ings = recomm.getIngs();
            for(i of ings){
                const id = await getIngId(i);
                ingsId.push(id);
            }
            console.log(ingsId);
            
            for(r of ingsId){
                const rf = await getRecIds(r);
            }
            toFindDuplicates(recIds);
            let cVal = Object.values(counts);
            let mx = Math.max(...cVal);
            for (let index = mx; index > 0; --index) {
                let matched = Object.keys(counts).filter(function(key) {
                    return counts[key] === index;
                });

                matched.forEach(m => {
                    let pint = parseInt(m);
                    finalRids.push(pint);
                });
            }
            
            console.log('before session if');
            console.log(finalRids);
            if (finalRids.length == 0) {
                req.flash('msg', "No recipes found given the inclusion and exclusion of ingredients, and user's food restrictions and allergies!");
                res.redirect('/recommend');
            }
            else{
                session = req.session;
                if(session.userId){ 
                    let result = await getUserFilter(session.userId);
                    if(result == 'got'){
                        let aArr = [];
                        let rArr = [];
                        let idFilter = [];
                        if(recomm.getAllergy()){
                            let aStr = recomm.getAllergy();
                            aArr = aStr.split(', ');
                        }
                        if(recomm.getRestrict()){
                            let rStr = recomm.getRestrict();
                            rArr = rStr.split(', ');
                        }
                        let idStr = await getFilteredIngIds(aArr, rArr);
                        idFilter = idStr.split('/'); //ing id of with restrictions and allergies
                    
                        console.log('ids of restrict ing');
                        console.log(idFilter);
                        for (const i of idFilter) {
                            const id = await getUserRecIds(i); //rec ids tht has the restriction and allergy ings
                        }
                        
                        console.log('rec ids of id filter');
                        console.log(userRecIds);
                        for (let index = 0; index < userRecIds.length; index++) {
                            const element = userRecIds[index];
                            if (finalRids.includes(element)) {
                                for(let i = 0; i < finalRids.length; i++){ 
                                    if (finalRids[i] === element) { 
                                        finalRids.splice(i, 1); 
                                    }
                                }
                            }
                            
                        }

                        if (finalRids.length > 0) {
                            for (const rec of finalRids) {
                                const rf = await getRecDetails(rec);
                            }

                            console.log(recId);
                            let msg = req.flash('msg');
                            conn.release();
                            res.render('recommendResults', {title: 'Recommended Recipes', ings: recomm.getIngs(), exIngs: recomm.getExIngs(), recName: recName, recId: recId, recImage: recImage, msg, id: session.userName});
                        }
                        else{
                            conn.release();
                            req.flash('msg', "No recipes found given the inclusion and exclusion of ingredients, and user's food restrictions and allergies!");
                            res.redirect('/recommend');
                        }
                        
                        
                    }
                }
                else{
                    for (const rec of finalRids) {
                        const rf = await getRecDetails(rec);
                    }

                    console.log(recId);
                    let msg = req.flash('msg');
                    conn.release();

                    res.render('recommendResults', {title: 'Recommended Recipes', ings: recomm.getIngs(), exIngs: recomm.getExIngs(), recName: recName, recId: recId, recImage: recImage, msg, id: ''});
                }
            }

        }
        
        if(exIngNum > 0){
            recomm.exIngs = JSON.parse(req.body.exIngsVal);
            console.log(recomm.getExIngs());
            let exIngsId = [];
            let rIds = [];
            //query to get ing ids of excluded ings
            function getExIngsId(id) {
                return new Promise((resolve, reject) => {
                    conn.query('SELECT * FROM ing WHERE ing_name = ?', [id], (err, iid) =>{
                        if(err){
                            console.log(err);
                        }
                        else if (iid[0]) {
                            let id = iid[0].ing_id;
                            resolve(id);
                        }
                        else{
                            req.flash('msg', 'There is an invalid ingredient! Look for misspelled and try again!');
                            res.redirect('/recommend');
                        }
                    })
                })
            }
            function getFinalRecIds(i) {
                return new Promise((resolve, reject) => {
                    conn.query('SELECT recId FROM recing WHERE ingId = ? LIMIT 35', [i], (err, recs) =>{
                        if(err){
                            console.log(err);
                        }
                        else if(recs){
                            for (let index = 0; index < recs.length; index++) {
                                const element = recs[index].recId;
                                rIds.push(element);
                            }
                            //let r = recs[0].recId;
                            resolve();
                        }
                        else{
                            req.flash('msg', 'No recipes found given the inclusion and exclusion of ingredients!');
                            res.redirect('/recommend');
                        }  
                    })
                })
            }
            async function getExIngs(){
                let exIngs = recomm.getExIngs();
                for (const ex of exIngs) {
                    let exids = await getExIngsId(ex);
                    exIngsId.push(exids);
                }
                console.log(exIngsId); //ing id of excluded ings
                
                for (const i of exIngsId) {
                    const rf = await getRecIds(i);
                }
                console.log(recIds);// rec id of recs that has the excluded ings
                
                //query to get ing id for inputted ings
                let ings = recomm.getIngs();
                for(i of ings){
                    const id = await getIngId(i);
                    ingsId.push(id);
                }
                console.log(ingsId); //ing id of included ings

                for (const i of ingsId) {
                    let r = await getFinalRecIds(i);
                    //recTempIds.push(r);
                }
                console.log(rIds); // rec ids of included ings
                for (let index = 0; index < recIds.length; index++) {
                    const element = recIds[index];
                    if (rIds.includes(element)) {
                        for(let i = 0; i < rIds.length; i++){ 
                            if (rIds[i] === element) { 
                                rIds.splice(i, 1); 
                            }
                        }
                    }
                    
                }

                toFindDuplicates(rIds);
                let cVal = Object.values(counts);
                let mx = Math.max(...cVal);
                for (let index = mx; index > 0; --index) {
                    let matched = Object.keys(counts).filter(function(key) {
                        return counts[key] === index;
                    });
                    matched.forEach(m => {
                        let pint = parseInt(m);
                        finalRids.push(pint);
                    });
                }

                console.log('before session if');
                console.log(finalRids);
                if (finalRids.length == 0) {
                    req.flash('msg', "No recipes found given the inclusion and exclusion of ingredients, and user's food restrictions and allergies!");
                    res.redirect('/recommend');
                }
                else{
                    session = req.session;
                    if(session.userId){ 
                        let result = await getUserFilter(session.userId);
                        if(result == 'got'){
                            let aArr = [];
                            let rArr = [];
                            let idFilter = [];
                            if(recomm.getAllergy()){
                                let aStr = recomm.getAllergy();
                                aArr = aStr.split(', ');
                            }
                            if(recomm.getRestrict()){
                                let rStr = recomm.getRestrict();
                                rArr = rStr.split(', ');
                            }
                            let idStr = await getFilteredIngIds(aArr, rArr);
                            idFilter = idStr.split('/'); //ing id of with restrictions and allergies
                        
                            console.log('ids of restrict ing');
                            console.log(idFilter);
                            for (const i of idFilter) {
                                const id = await getUserRecIds(i); //rec ids tht has the restriction and allergy ings
                            }
                            
                            console.log('rec ids of id filter');
                            console.log(userRecIds);
                            for (let index = 0; index < userRecIds.length; index++) {
                                const element = userRecIds[index];
                                if (finalRids.includes(element)) {
                                    for(let i = 0; i < finalRids.length; i++){ 
                                        if (finalRids[i] === element) { 
                                            finalRids.splice(i, 1); 
                                        }
                                    }
                                }
                                
                            }
    
                            if (finalRids.length > 0) {
                                for (const rec of finalRids) {
                                    const rf = await getRecDetails(rec);
                                }
    
                                console.log(recId);
                                let msg = req.flash('msg');
                                conn.release();
                                res.render('recommendResults', {title: 'Recommended Recipes', ings: recomm.getIngs(), exIngs: recomm.getExIngs(), recName: recName, recId: recId, recImage: recImage, msg, id: session.userName});
                            }
                            else{
                                conn.release();
                                req.flash('msg', "No recipes found given the inclusion and exclusion of ingredients, and user's food restrictions and allergies!");
                                res.redirect('/recommend');
                            }
                            
                            
                        }
                    }
                    else{
                        for (const rec of finalRids) {
                            const rf = await getRecDetails(rec);
                        }
    
                        console.log(recId);
                        let msg = req.flash('msg');
                        conn.release();
    
                        res.render('recommendResults', {title: 'Recommended Recipes', ings: recomm.getIngs(), exIngs: recomm.getExIngs(), recName: recName, recId: recId, recImage: recImage, msg, id: ''});
                    }
                }
                
            }
            //func to return reciped without the excluded ings
            getExIngs();
        }
        else{ 
            //func to return recipes based on ings
            getRecommRec();
        }
    }
})
} catch (error) {
res.status(500).json({ message: error.message});
}
}

exports.userRateRec = (req, res) =>{
    try {
        session = req.session;
        if(session.userId){
            pool.getConnection((err, conn)=>{
                if(err){
                    console.log(err);
                }
                else{
                    let id = req.params.id;
                    conn.query('SELECT user_ratedRecs FROM users WHERE user_id = ?', [session.userId], (err, rated) =>{
                        if (err) {
                            console.log(err);   
                        } else {
                            let getRated = rated[0].user_ratedRecs;
                            if(getRated === null){
                                getRated = '';
                            }
                            getRated += id.toString() + '/';

                            conn.query('UPDATE users SET user_ratedRecs = ? WHERE user_id = ?', [getRated, session.userId], (err, row) => {
                                if(err){
                                    console.log(err);
                                }
                                else{
                                    let rate = req.body.userRate;
                                    let recCount = req.body.ratingCount
                                    if(recCount === null){
                                        recCount = 0;
                                    }
                                    recCount += 1;
                                    conn.query('UPDATE rec SET rec_rate = ?, rec_rateCount = ? WHERE rec_id = ?', [rate, recCount, id], (err, row) => {
                                        if(err){
                                            console.log(err);
                                        }
                                        else{
                                            req.flash('msg', 'Recipe successfully rated!');
                                            res.redirect('/recipes/' + id);
                                        }
                                    })
                                }
                            })

                        }
                    })
                    
                }
            })
        }else{
            req.flash('msg', 'You need to login to rate the recipe!')
            res.redirect('/login');
        }
        
    } catch (error) {
        res.status(500).json({ message: error.message});
    }
}

exports.userSaveRec = (req, res) =>{
    try {
        session = req.session;
        if(session.userId){
            pool.getConnection((err, conn)=>{
                let userid = req.session.userId;
                let id = req.body.recID;
                let name = req.body.recName;
                let desc = req.body.recDesc;
                let categ = req.body.recCateg;
                let time = req.body.recTime;
                let serving = req.body.recServing;
                let src = req.body.recSrc;
                let vid = req.body.recVid;
                let cal = req.body.recCal;
                let pr = req.body.recProcess;
                let mealTime = req.body.recMealtime;
                let img = req.body.recImg;
                let rate = req.body.recRate;
                // console.log(rec_id);
                if(err){
                    console.log(err);
                }
                else{
                    conn.query('SELECT user_Saved FROM users WHERE user_id = ?', [session.userId], (err, saved) =>{
                        if (err) {
                            console.log(err);   
                        } else {
                            let getSaved = saved[0].user_Saved;
                            if(getSaved === null){
                                getSaved = '';
                            }
                            getSaved += id.toString() + '/';

                            conn.query('UPDATE users SET user_Saved = ? WHERE user_id = ?', [getSaved, session.userId], (err, row) => {
                                if(err){
                                    console.log(err);
                                }
                                else{
                                    // console.log(rec_id);
                                    conn.query('INSERT INTO saved(user_id, rec_id, rec_name, rec_desc, rec_process, rec_categ, rec_time, rec_serving, rec_src, rec_vid, rec_cal, rec_mealTime, rec_img, rec_rate) VALUE(?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [userid, id, name, desc, pr, categ, time, serving, src, vid, cal, mealTime, img, rate], (err, row) => {
                                        if(err){
                                            console.log(err);
                                        }
                                         else{
                                            conn.query('INSERT IGNORE INTO saved_recing(rec_id, ingId, ingQuant, ingUnit, ingIns) SELECT recId, ingId, ingQuant, ingUnit, ingIns FROM recing WHERE recId = ?', [id], (err, row) => {
                                                if(err){
                                                    console.log(err);
                                                } else{
                                                    req.flash('msg', 'Recipe successfully saved!');
                                                    res.redirect('/recipes/' + id); 
                                                }
                                            })

                       
                                        }
                                    })
                                }
                            })

                        }
                    })
                    
                }
            })
        }else{
            req.flash('msg', 'You need to login to rate the recipe!')
            res.redirect('/login');
        }
        
    } catch (error) {
        res.status(500).json({ message: error.message});
    }
}

exports.userSavedRecipes = (req, res) =>{
    try {
        session = req.session;
        function getRec(conn, name) {
            conn.query('SELECT * FROM saved', (err, save) => {
                if (err) {
                    console.log(err);   
                } else {
                    res.render('saved', { title: 'Recipes', save: save, id: name});
                }
            })
        }
        if(session.userId){
            pool.getConnection((err, conn)=>{
                    if(err){
                        console.log(err);
                    }
                    else{
                        getRec(conn, session.userName);
                    }})
        }else{
            req.flash('msg', 'You need to login to view saved recipes!')
            res.redirect('/login');
        }
        
    } catch (error) {
        res.status(500).json({ message: error.message});
    }
}

exports.userSavedRView = (req, res) => {
    try {
        pool.getConnection((err, conn) => {
            if(err){
                console.log('error in user recipes...\n');
            }
            else{
                let rId = req.params.id;
                conn.query('SELECT * FROM saved WHERE rec_id = ?',[rId], (err, save) => {
                    if(err){
                        console.log('cannot fetch recipes in db...\n');
                    }
                    else{
                        let regexQuant = /[+-]?\d+(\.\d+)?/g;
                        let regexStr = /\b(\w+)\b/g;
                        let finalStr = '';
                        let quantArr = [];
                        let recIngs = [];
                        let ingStringArr = [];
                        let ingStr = '';
                        let qStr = 'SELECT saved_recing.*, ing_name FROM `saved_recing` INNER JOIN ing ON saved_recing.ingId=ing.ing_id WHERE saved_recing.rec_id = ?';
                        function getIngs(id){
                            return new Promise((resolve, reject) => {
                                conn.query(qStr, [id], (err, ings) => {
                                    if(err){
                                        console.log(err, '\n');
                                    }
                                    else{
                                        ings.forEach(ing => {
                                            let ingq = ing.ingQuant;
                                            let ingu = ing.ingUnit;
                                            let ingi = ing.ingIns;
                                            if(!ing.ingQuant || ing.ingQuant == 0){
                                                ingq = '';
                                            }
                                            if(!ing.ingUnit){
                                                ingu = '';
                                            }
                                            if(!ing.ingIns){
                                                ingi = '';
                                            }
                                            let temp = ingq + ' ' + ingu + ' ' + ing.ing_name + ' ' + ingi;
                                            ingStringArr.push(temp);
                                        });
                                        ingStr = ingStringArr.join('/');
                                        ingStringArr = []; 
                                        resolve(ingStr);
                                    }
                                })
                            })
                        }
                        async function getAllRecIng(save){
                            for(id of save){
                                ingStr = await getIngs(id.rec_id);
                                let ingArr = ingStr.split('/');
                                for (const i of ingArr) {
                                    let quantNum = i.match(regexQuant);
                                    let iStr = i.match(regexStr); 
                                    if(Array.isArray(quantNum)){
                                        //console.log(quantNum);
                                        quantArr.push(quantNum[0]);
                                    }else{
                                        quantArr.push(quantNum);
                                    }
                                    for (let index = 0; index < iStr.length; index++) {
                                        const element = iStr[index];
                                        if (isNaN(element)) {
                                            finalStr += ' ' + element;
                                        }
                                    }
                                    recIngs.push(finalStr);
                                    finalStr = '';
                                }
                            }
                            conn.release();
                            let msg = req.flash('msg');
                            session = req.session;
                            if(session.userId){
                                res.render('userSavedRView', { save: save, recIngs: recIngs, quantArr: quantArr, msg, id: session.userName});
                            }
                            else{
                                res.render('userSavedRView', { save: save, recIngs: recIngs, quantArr: quantArr, msg, id: ''});
                            }
                            
                        }
                        getAllRecIng(save);
                    }
                })

            }
        })
    } catch (error) {
        res.status(500).json({ message: error.message});
    }
}

exports.userSavedEdit = (req, res) => {
    try {
        let rId = req.params.id;
        pool.getConnection((err, conn) => {
            if(err){
                console.log(err, '\n');
                conn.release();   
            }
            else{
                conn.query('SELECT * FROM saved WHERE rec_id = ?', [rId], (err, row) =>{
                    if(err){
                        console.log(err, '\n');
                        conn.release();  
                    }
                    else{
                        //console.log(row);
                        conn.query('SELECT saved_recing.*, ing_name FROM `saved_recing` INNER JOIN ing ON saved_recing.ingId=ing.ing_id WHERE rec_id = ?',[rId], (err, ingRow) =>{
                            if(err){
                                console.log(err, '\n');
                                conn.release();  
                            }
                            else{
                                res.render('userSavedEdit', {title: 'Edit Recipe', save: row, ing: ingRow});
                                conn.release();  
                            }
                        }) 
                    }  
                })
            }
        })
        }
     catch (error) {
        res.status(500).json({ message: error.message });
    }
}

exports.userSavedSubEdit = (req,res) => { 
    try {
        session = req.session;
        pool.getConnection((err, conn)=>{
            if(err){
                console.log(err, '\n');
            }
            else{
                let rId = req.params.id;
                let rec = new Recipe.Recipe();
                rec.name = req.body.recNameInp;
                rec.desc = req.body.recDescInp;
                rec.prc = req.body.recPrcInp;
                rec.categ = req.body.recCateg;
                rec.time = req.body.recTimeInp;
                rec.srv = req.body.recSrvInp;
                rec.src = req.body.recSrcInp;
                rec.vid = req.body.recVidInp;
                rec.cal = req.body.recCalInp;
                rec.mTime = req.body.recMTimeInp;
                let mString = '';
                if(Array.isArray(rec.getRecMTime())){
                    rec.getRecMTime().forEach(time => {
                        mString += time + ', ';
                    });
                }else{
                    mString = rec.getRecMTime();
                }
                conn.query('UPDATE `saved` SET `rec_name`= ?,`rec_desc`= ?,`rec_process`= ?,`rec_categ`= ?,`rec_time`= ? ,`rec_serving`= ?,`rec_src`= ?,`rec_vid`= ?,`rec_cal`= ?,`rec_mealTime`= ? WHERE rec_id = ?', [rec.getRecName(), rec.getRecDesc(), rec.getRecPrc(), rec.getRecCateg(), rec.getRecTime(), rec.getRecSrv(), rec.getRecSrc(), rec.getRecVid(), rec.getRecCal(), mString, rId], (err, save) => {
                    if(err){
                        console.log(err, '\n');
                    }
                    else{
                        conn.query('DELETE FROM saved_recing WHERE rec_id = ?', [rId], (err, row) =>{
                            if(err){
                                console.log(err, '\n');
                            }
                            else{ 

                        let ing = new Recipe.Ing();
                        let ingNum = req.body.ingNum;
                        ing.quant = JSON.parse(req.body.qval);
                        ing.name = JSON.parse(req.body.idval);
                        ing.unit = JSON.parse(req.body.uval);
                        ing.ins = JSON.parse(req.body.insval);

                        function insertNewIng(ingName){
                            return new Promise((resolve, reject) => {
                                conn.query('INSERT INTO ing(ing_name) VALUES (?)', [ingName],(err, ins) =>{
                                    if(err){
                                        console.log(err, '\n');
                                    } else{
                                        let ii = ins.insertId;
                                        resolve(ii);
                                    }
                                });
                            })
                        }
                        async function insertRecIng(ingName, qf, ingUnit, ingIns){
                            const ii = await insertNewIng(ingName);
                            conn.query('INSERT INTO saved_recing(rec_id, ingId, ingQuant, ingUnit, ingIns) VALUES (?, ?, ?, ?, ?)', [rId, ii, qf, ingUnit, ingIns], (err, row) => {
                                if(err){
                                    console.log(err, '\n');
                                    conn.release();
                                }
                                else{
                                    console.log('new ing added + recing inserted...\n');
                                }
                            })
                            
                        }

                        for(let z = 0; z < ingNum; z++){
                            let ingQuant = ing.getIngQuant()[z];
                            let ingUnit = ing.getIngUnit()[z];
                            let ingName = ing.getIngName()[z];
                            let ingIns = ing.getIngIns()[z];
                            let qf; 
                            if(parseFloat(ingQuant)){
                                qf = parseFloat(ingQuant);
                            }
                            else{
                                qf = 0;
                            }

                            conn.query('SELECT * FROM ing WHERE ing_name = ?', [ingName], (err, rows) =>{
                                if(err){
                                    console.log(err, '\n');
                                }
                                else if(rows[0]){
                                    let ii = rows[0].ing_id;
                                    conn.query('INSERT INTO saved_recing(rec_id, ingId, ingQuant, ingUnit, ingIns) VALUES (?, ?, ?, ?, ?)', [rId, ii, qf, ingUnit, ingIns], (err, row) => {
                                        if(err){
                                            console.log(err, '\n');
                                            conn.release();
                                        }
                                        else{
                                            console.log('recing added...\n');
                                        }
                                    })
                                }
                                else{
                                    insertRecIng(ingName, qf, ingUnit, ingIns);
                                }
                            })
                        }
                        
                        res.redirect('/saved');
                            }
                        })
                    }
                })
            }
        })
    } catch (error) {
        res.json({ message: error.message });
    }
}

exports.userSavedDelete = (req, res) => {
    try{
        session = req.session;
        if(session.userId){
            pool.getConnection((err, conn) => {
                let id = req.params.id;
                conn.query('DELETE FROM saved where rec_id =?', [id], (err, result) => {
                    if(err){
                        console.log('not deleted');
                        res.redirect('/saved'); 
                        conn.release();
                    }
                    else{
                        conn.query('DELETE FROM saved_recing WHERE rec_id =?', [id]);
                        conn.query('DELETE user_Saved FROM user WHERE rec_id LIKE ?', [id]);
                        conn.release();
                        res.redirect('/saved'); 
                    }
                })
            })
        }
    }
    catch(error){
        res.status(500).json({ message: error.message });

    }
}

exports.userRecipes = (req, res) =>{
    try {
        function getRec(conn, name) {
            conn.query('SELECT * FROM rec', (err, recs) => {
                if (err) {
                    console.log(err);   
                } else {
                    res.render('userRecipes', { title: 'Recipes', recs: recs, id: name});
                }
            })
        }
        pool.getConnection((err, conn) => {
            if (err) {
                console.log(err);
            } else{
                session = req.session;
                if (session.userId) {
                    getRec(conn, session.userName);
                }
                else{
                    getRec(conn, '');
                }
            }
        })
        
    } catch (error) {
        res.status(500).json({ message: error.message});
    }
}

exports.userSortRecipes = (req, res) =>{
    try {
        function sortRecsA(conn, alphabet, name) {
            if (alphabet === 'a-z') {
                conn.query('SELECT * FROM rec ORDER BY rec_name', (err, recs) =>{
                    if (err) {
                        console.log(err);   
                    } else {
                        conn.release();
                        res.render('userRecipes', { title: 'Recipes', recs: recs, id: name});
                    }
                })
            } else {
                conn.query('SELECT * FROM rec ORDER BY rec_name DESC', (err, recs) =>{
                    if (err) {
                        console.log(err);   
                    } else {
                        conn.release();
                        res.render('userRecipes', { title: 'Recipes', recs: recs, id: name});
                    }
                })
            }
        }
        function sortRecsR(conn, rating, name) {
            if(rating === 'h-l'){
                conn.query('SELECT * FROM rec ORDER BY rec_rate DESC', (err, recs) =>{
                    if (err) {
                        console.log(err);   
                    } else {
                        conn.release();
                        res.render('userRecipes', { title: 'Recipes', recs: recs, id: name});
                    }
                })
            } else {
                conn.query('SELECT * FROM rec ORDER BY rec_rate', (err, recs) =>{
                    if (err) {
                        console.log(err);   
                    } else {
                        conn.release();
                        res.render('userRecipes', { title: 'Recipes', recs: recs, id: name});
                    }
                })
            }
        }
        pool.getConnection((err, conn) => {
            if (err) {
                console.log(err);
            } else{
                let alphabet = req.body.alphabet;
                let rating = req.body.rating;

                session = req.session;
                if (session.userId) {
                    if(alphabet){
                        sortRecsA(conn, alphabet, session.userName)
                    }
                    else{
                        sortRecsR(conn, rating, session.userName);
                    }
                }
                else{
                    if(alphabet){
                        sortRecsA(conn, alphabet, '')
                    }
                    else{
                        sortRecsR(conn, rating, '');
                    }
                }
            }
        })
        
    } catch (error) {
        res.status(500).json({ message: error.message});
    }
}

exports.userRecommend = (req,res) =>{
    try {
        session = req.session;
        if(session.userId){
            let msg = req.flash('msg');
            res.render('recommend', {title: 'Recipe Recommender', msg, id: session.userName});
        }
        else{
            let msg = req.flash('msg');
            res.render('recommend', {title: 'Recipe Recommender', msg, id: ''});
        }
    } catch (error) {
        res.status(500).json({ message: error.message});
    }
}

exports.userRecommAC = (req,res) =>{
    try {
        pool.getConnection((err, conn) =>{
            if(err){
                console.log(err);
            }
            else{
                conn.query('SELECT ing_name FROM ing WHERE ing_name LIKE ? ORDER BY ing_name LIMIT 5',[req.body.ing + '%'], (err, ings) =>{
                    if(err){
                        console.log(err);
                    }
                    else{
                        conn.release();
                        res.json({data: ings});
                    }
                })
            }
        })
    } catch (error) {
        res.status(500).json({ message: error.message});
    }
}

exports.userRecommAdd= (req,res) =>{
    try {
        this.userRecommendRecipe(req,res); 
    } catch (error) {
        res.status(500).json({ message: error.message});
    }
}

exports.profilePage = (req,res) => {
    try {
        session = req.session;
        if(session.userId){
            pool.getConnection((err, conn) => {
                if(err){
                    console.log(err);
                }
                else{
                    conn.query('SELECT * FROM users WHERE user_id = ?', [session.userId], (err, user) => {
                        if(err){
                            console.log(err);
                        } else {
                            conn.release();
                            let msg = req.flash('msg');
                            res.render('userProfile', { user: user, id: session.userName, msg})
                        }
                    })
                }
            })
        }
    } catch (error) {
        res.status(500).json({ message: error.message});
    }
}

exports.updateProfile = (req,res) => {
    try {
        session = req.session;
        if(session.userId){
            pool.getConnection((err, conn) => {
                if(err){
                    console.log(err);
                }
                else{
                    let user = new User.User();
                    user.name = req.body.userName;
                    user.allergy = req.body.faInp;
                    user.restrict = req.body.dietRInp;

                    let aStr = '';
                    let rStr = '';
                    if(user.getUserAllergy()){
                        if(Array.isArray(user.getUserAllergy())){
                            user.getUserAllergy().forEach(a => {
                                aStr += a + ', ';
                            });
                        }
                        else{
                            aStr = user.getUserAllergy();
                        }
                    }
                    if(user.getUserRestrict()){
                        if(Array.isArray(user.getUserRestrict())){
                            user.getUserRestrict().forEach(r => {
                                rStr += r + ', ';
                            });
                            rStr = rStr.toLowerCase();
                        }
                        else{
                            rStr = user.getUserRestrict();
                            rStr = rStr.toLowerCase();
                        }
                    }

                    conn.query('UPDATE `users` SET `user_name`= ? ,`user_allergy`= ?,`user_restrict`= ? WHERE user_id = ?', [user.getUserName(), aStr, rStr, session.userId], (err, user) => {
                        if(err){
                            console.log(err);
                        } else {
                            conn.release();
                            req.flash('msg', 'profile successfully updated!');
                            res.redirect('/profile');
                        }
                    })
                }
            })
        }
    } catch (error) {
        res.status(500).json({ message: error.message});
    }
}

exports.groceryPage = (req, res) => {
    try {
        session = req.session;
        if(session.userId){
            function getGList() {
                return new Promise((resolve, reject) => {
                    pool.getConnection((err, conn) => {
                        if (err) {
                            console.log(err);
                        } else {
                            conn.query('SELECT user_grocery FROM users WHERE user_id = ?', [session.userId], (err, rows) => {
                                if (err) {
                                    console.log(err);       
                                } 
                                else {
                                    let gListStr = rows[0].user_grocery;
                                    if(gListStr){
                                        resolve(gListStr);
                                    }
                                    else{
                                        resolve('');
                                    }
                                    
                                }
                            })
                        }
                    })
                })
            }
            async function renderPage() {
                let gListArr = [];
                let str = await getGList();
                gListArr = str.split('/');

                let msg = req.flash('msg');
                res.render('grocery', {msg, id: session.userName, list: gListArr});
            }

            renderPage();
        }
        else{
            req.flash('msg', 'you need to log in first!');
            res.redirect('/login');
        }
    } catch (error) {
        res.status(500).json({ message: error.message});
    }
}
exports.addGrocery = (req,res) => {
    try {
        session = req.session;
        if(session.userId){
            let recId = req.body.recId;
            let gList = JSON.parse(req.body.gList);
            let gListStr = '';
            if(Array.isArray(gList)){
                gList.forEach(g => {
                    gListStr += g + '/';
                });
            }
            else{
                gListStr = gList;
            }
            pool.getConnection((err, conn) => {
                if (err) {
                    console.log(err);
                } else {
                    conn.query('SELECT user_grocery FROM users WHERE user_id = ?', [session.userId], (err, row) =>{
                        if (err) {
                            console.log(err);
                        } else {
                            let listStr = row[0].user_grocery;
                            if(listStr){
                                listStr += gListStr + '/';
                                updateGList(listStr);
                            }
                            else{
                                updateGList(gListStr);
                            }
                        }
                    })
                    function updateGList(str){
                        conn.query('UPDATE `users` SET `user_grocery`= ? WHERE user_id = ?', [str, session.userId], (err, row) =>{
                            if (err) {
                                console.log(err);
                            } else {
                                conn.release();
                                req.flash('msg', 'ingredients added to your grocery list!');
                                res.redirect('/recipes/' + recId);
                            }
                        })
                    }
                }
            })
        }
        else{
            req.flash('msg', 'you need to log in first!');
            res.redirect('/login');
        }
    } catch (error) {
        res.status(500).json({ message: error.message});
    }
}

exports.addItem = (req, res) => {
    try {
        session = req.session;
        if(session.userId){
            console.log('here in addItem');
            pool.getConnection((err, conn) => {
                if (err) {
                    console.log(err);
                }
                else{
                    if(req.body.itemVal){
                        let newListArr = JSON.parse(req.body.itemVal);
                        console.log(newListArr);
                        let newListStr = '';
                        if(Array.isArray(newListArr)){
                            newListArr.forEach(i => {
                                newListStr += i + '/';
                            });
                        }
                        else{
                            newListStr = newListArr;
                        }

                        conn.query('UPDATE `users` SET `user_grocery`= ? WHERE user_id = ?', [newListStr, session.userId], (err, row) =>{
                            if (err) {
                                console.log(err);
                            } else {
                                conn.release();
                                res.redirect('/grocery-list');
                            }
                        })

                    }
                    else{
                        conn.query('UPDATE `users` SET `user_grocery`= ? WHERE user_id = ?', [null, session.userId], (err, row) =>{
                            if (err) {
                                console.log(err);
                            } else {
                                conn.release();
                                res.redirect('/grocery-list');
                            }
                        })
                    }


                }

            })
        }
        else{
            req.flash('msg', 'you need to log in first!');
            res.redirect('/login');
        }
    } catch (error) {
        res.status(500).json({ message: error.message});
    }
}
exports.getFilter = (req,res) => {
    try{
        function timeFilter (conn, mealTime){
            if (mealTime == 30){
                conn.query('SELECT * FROM rec WHERE rec_time IN (0,15, 16, 17, 18 ,19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30)  ORDER BY rec_time ASC LIMIT 35;', [mealTime],(err, filter) =>{
                    if(err){
                        console.log(err);
                    }else{
                        console.log(mealTime);
                        session = req.session;
                        if(session.userId){
                            conn.release();
                            res.render('userSearchResults', {title: 'Filter Results', recs: filter, id: session.userName});
                        }
                        else{
                            conn.release();
                            res.render('userSearchResults', {title: 'Filter Results', recs: filter, id: ''});
                    }}
                }) 
            }
            else if(mealTime == 31){
                conn.query('SELECT * FROM rec WHERE rec_time IN (40, 41, 42, 43, 44,45,47,48,49,50,55,56,57,58,59, "1 hr%")  ORDER BY rec_time ASC LIMIT 35;',(err, filter) =>{
                    if(err){
                        console.log(err);
                    }else{
                        console.log(mealTime);
                        session = req.session;
                        if(session.userId){
                            conn.release();
                            res.render('userSearchResults', {title: 'Filter Results', recs: filter, id: session.userName});
                        }
                        else{
                            conn.release();
                            res.render('userSearchResults', {title: 'Filter Results', recs: filter, id: ''});
                    }}
                }) 
            }
            else if(mealTime =="1 hr and 30 minutes"){
                conn.query('SELECT * FROM rec WHERE rec_time LIKE "1 h%" ORDER BY rec_time ASC LIMIT 35;',(err, filter) =>{
                    if(err){
                        console.log(err);
                    }else{
                        console.log(mealTime);
                        session = req.session;
                        if(session.userId){
                            conn.release();
                            res.render('userSearchResults', {title: 'Filter Results', recs: filter, id: session.userName});
                        }
                        else{
                            conn.release();
                            res.render('userSearchResults', {title: 'Filter Results', recs: filter, id: ''});
                    }}
                }) 
            }
            else if (mealTime =="1 hr and 31 minutes"){
                conn.query('SELECT * FROM rec WHERE rec_time >= "1 hour and 3% minutes" ORDER BY rec_time ASC LIMIT 35;',(err, filter) =>{
                    if(err){
                        console.log(err);
                    }else{
                        console.log(mealTime);
                        session = req.session;
                        if(session.userId){
                            conn.release();
                            res.render('userSearchResults', {title: 'Filter Results', recs: filter, id: session.userName});
                        }
                        else{
                            conn.release();
                            res.render('userSearchResults', {title: 'Filter Results', recs: filter, id: ''});
                    }}
                }) 
            }
        };
        function calorieFilter(conn, calorie){
            if(calorie=="400"){
                conn.query('SELECT * FROM rec WHERE rec_cal BETWEEN 100 AND 400 ORDER BY rec_cal ASC LIMIT 35;',(err, filter) =>{
                    if(err){
                        console.log(err);
                    }else{
                        console.log(calorie);
                        session = req.session;
                        if(session.userId){
                            conn.release();
                            res.render('userSearchResults', {title: 'Filter Results', recs: filter, id: session.userName});
                        }
                        else{
                            conn.release();
                            res.render('userSearchResults', {title: 'Filter Results', recs: filter, id: ''});
                    }}
            })
        }
        else if(calorie=="800"){
                conn.query('SELECT * FROM rec WHERE rec_cal BETWEEN 401 AND 800 ORDER BY rec_cal ASC LIMIT 35;',(err, filter) =>{
                    if(err){
                        console.log(err);
                    }else{
                        console.log(calorie);
                        session = req.session;
                        if(session.userId){
                            conn.release();
                            res.render('userSearchResults', {title: 'Filter Results', recs: filter, id: session.userName});
                        }
                        else{
                            conn.release();
                            res.render('userSearchResults', {title: 'Filter Results', recs: filter, id: ''});
                    }}
            })
        }
        else if(calorie=="801"){
                conn.query('SELECT * FROM rec WHERE rec_cal BETWEEN 801 AND 1200 ORDER BY rec_cal ASC LIMIT 35;',(err, filter) =>{
                    if(err){
                        console.log(err);
                    }else{
                        console.log(calorie);
                        session = req.session;
                        if(session.userId){
                            conn.release();
                            res.render('userSearchResults', {title: 'Filter Results', recs: filter, id: session.userName});
                        }
                        else{
                            conn.release();
                            res.render('userSearchResults', {title: 'Filter Results', recs: filter, id: ''});
                    }}
            })
        }
        else if(calorie=="1201"){
                conn.query('SELECT * FROM rec WHERE rec_cal > 1201 ORDER BY rec_cal ASC LIMIT 35;',(err, filter) =>{
                    if(err){
                        console.log(err);
                    }else{
                        console.log(calorie);
                        session = req.session;
                        if(session.userId){
                            conn.release();
                            res.render('userSearchResults', {title: 'Filter Results', recs: filter, id: session.userName});
                        }
                        else{
                            conn.release();
                            res.render('userSearchResults', {title: 'Filter Results', recs: filter, id: ''});
                    }}
            })
        }
        };
        let dishType = req.body.recDishInp;
        let categoryRec = req.body.recCateg;
        let mealTime = req.body.recTimeInp;
        let calorie = req.body.recCal;
        console.log('filtering..');
        console.log(mealTime);
        pool.getConnection((err,conn) =>{
            if(err){
                console.log(err);
            }
            else{
                if(mealTime){
                    timeFilter(conn, mealTime);
                }
                else if (calorie){
                    calorieFilter(conn, calorie);
                }
                else{
                    conn.query('SELECT * FROM rec WHERE rec_mealTime LIKE ? OR rec_categ LIKE ? OR rec_time LIKE ?', ['%' +req.body.recDishInp + '%', req.body.recCateg, '%' +req.body.recTimeInp + '%'], (err, filter) =>{
                        if(err){
                            console.log(err);
                        }else{
                            console.log(dishType);
                            console.log(categoryRec);
                            console.log(mealTime);
                            session = req.session;
                            if(session.userId){
                                conn.release();
                                res.render('userSearchResults', {title: 'Filter Results', recs: filter, id: session.userName});
                            }
                            else{
                                conn.release();
                                res.render('userSearchResults', {title: 'Filter Results', recs: filter, id: ''});
                        }}
                    })
                }
            }
        })
    }catch (error) {
        res.status(500).json({ message: error.message});
    }
}

exports.mealPlan = (req, res) =>{
    Date.prototype.getWeek = function() {
        var date = new Date(this.getTime());
        date.setHours(0, 0, 0, 0);
        // Thursday in current week decides the year.
        date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
        // January 4 is always in week 1.
        var week1 = new Date(date.getFullYear(), 0, 4);
        // Adjust to Thursday in week 1 and count number of weeks from date to week1.
        return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
      };
    try {
        session = req.session;
        if(session.userId){
            pool.getConnection((err, conn)=>{
                if(err){
                    console.log(err);
                }
                else{
                    let id = req.body.recID;
                    conn.query('SELECT user_mealPlan FROM users WHERE user_id = ?', [session.userId], (err, mealPlan) =>{
                        if (err) {
                            console.log(err);   
                        } else {
                            let getmeal = mealPlan[0].user_mealPlan;
                            if(getmeal === null){
                                getmeal = '';
                            }
                            getmeal += id + '/';

                            conn.query('UPDATE users SET user_mealPlan = ? WHERE user_id = ?', [getmeal, session.userId], (err, row) => {
                                if(err){
                                    console.log(err);
                                }
                                else{
                                    let dateTime = req.body.datetimes;
                                    let date = new Date(dateTime);
                                    let rec = new Recipe.Recipe();
                                    let userid = req.session.userId;
                                    let id = req.body.recID;
                                    let mon = String(date.getMonth());
                                    let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                                    let days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                                    let month = months[date.getMonth()];
                                    let day = date.getDate();
                                    let day1 = String(date.getDate());
                                    let dayMonth = day1 + mon;
                                    let sDay = days[date.getDay()];
                                    let week = date.getWeek();
                                    let hr = date.getHours();
                                    let ampm = "am";
                                    if( hr > 12 ) {
                                        hr -= 12;
                                        ampm = "pm";
                                    }
                                    let min = date.getMinutes();
                                    if (min < 10) {
                                        min = "0" + min;
                                    }
                                    let time = hr + ":" + min + ampm;
                                    console.log(month, day, sDay, time, date, week, dayMonth);
                                    conn.query('INSERT INTO mealPlan(user_id, rec_id, month, day, time, sDay, weekCount, dateTime, dayMonth) VALUE(?,?,?,?,?,?,?,?,?)', [req.session.userId, id, month, day, time, sDay, week, dateTime, dayMonth], (err, row) => {
                                    if(err){
                                        console.log(err);
                                    }
                                    else{
                                        req.flash('msg', 'Recipe successfully saved to meal plan!');
                                        res.redirect('/recipes/' + id); 
                                    }
                                    })
                                    conn.release();
                                }
                            })

                        }
                    })
                    
                }
            })
        }else{
            req.flash('msg', 'You need to login to add the recipe to meal plan!')
            res.redirect('/login');
        }
        
    } catch (error) {
        res.status(500).json({ message: error.message});
    }
}

exports.mealPlanRec = (req, res) =>{
    try {
        session = req.session;
        /*function startAndEndOfWeek(date) {
                let now = date ? new Date(date) : new Date().setHours(0, 0, 0, 0);
                let monday = new Date(now);
                monday.setDate(monday.getDate() - monday.getDay() + 1);
                let sunday = new Date(now);
                sunday.setDate(sunday.getDate() - sunday.getDay() + 7);
                return [monday, sunday];
        }*/
        /*Date.prototype.getWeek = function(){
            return [new Date(this.setDate(this.getDate()-this.getDay()))]
                     .concat(
                       String(Array(6)).split(',')
                          .map ( function(){
                                  return new Date(this.setDate(this.getDate()+1));
                                }, this )
                     );
        }*/
        Date.prototype.getWeek = function() {
            var date = new Date(this.getTime());
            date.setHours(0, 0, 0, 0);
            // Thursday in current week decides the year.
            date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
            // January 4 is always in week 1.
            var week1 = new Date(date.getFullYear(), 0, 4);
            // Adjust to Thursday in week 1 and count number of weeks from date to week1.
            return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
        };
        function getRec(conn, name) {
            let date = new Date();
            let dateC = date.getWeek();
            //'SELECT * FROM rec INNER JOIN mealPlan ON rec.rec_id=mealPlan.rec_id ORDER BY mealPlan.dateTime DESC' 'SELECT * FROM mealPlan ORDER BY dateTime'
            conn.query('SELECT * FROM rec INNER JOIN mealPlan ON rec.rec_id=mealPlan.rec_id WHERE mealPlan.weekCount = ? ORDER BY mealPlan.day',[dateC], (err, mealPlan) => {
                if (err) {
                    console.log(err);   
                } else {
                    res.render('mealPlan', { title: 'Meal Plan', mealPlan: mealPlan, id: name});
                }
            })
        };
        if(session.userId){
            pool.getConnection((err, conn)=>{
                    if(err){
                        console.log(err);
                    }
                    else{
                        getRec(conn, session.userName);
                    }})
        }else{
            req.flash('msg', 'You need to login to view mealplan!')
            res.redirect('/login');
        }
        
    } catch (error) {
        res.status(500).json({ message: error.message});
    }
}

exports.mealPlanRecView = (req, res) => {
    try {
        pool.getConnection((err, conn) => {
            if(err){
                console.log('error in user recipes...\n');
            }
            else{
                let rId = req.params.id;
                conn.query('SELECT * FROM rec WHERE rec_id = ?',[rId], (err, recs) => {
                    if(err){
                        console.log('cannot fetch recipes in db...\n');
                    }
                    else{
                        let regexQuant = /[+-]?\d+(\.\d+)?/g;
                        let regexStr = /\b(\w+)\b/g;
                        let finalStr = '';
                        let quantArr = [];
                        let recIngs = [];
                        let ingStringArr = [];
                        let ingI = [];
                        let insArr = [];
                        let ingIStr = '';
                        let ingStr = '';
                        let qStr = 'SELECT recing.*, ing_name FROM `recing` INNER JOIN ing ON recing.ingId=ing.ing_id WHERE recing.recId = ?';
                        function getIngs(id){
                            return new Promise((resolve, reject) => {
                                conn.query(qStr, [id], (err, ings) => {
                                    if(err){
                                        console.log(err, '\n');
                                    }
                                    else{
                                        ings.forEach(ing => {
                                            let ingq = ing.ingQuant;
                                            let ingu = ing.ingUnit;
                                            let ingi = ing.ingIns;
                                            
                                            if(!ing.ingQuant){
                                                ingq = 0;
                                            }
                                            if(!ing.ingUnit){
                                                ingu = '';
                                            }
                                            if(!ing.ingIns){
                                                ingi = '';
                                            }
                                            let temp = ingq + ' ' + ingu + ' ' + ing.ing_name;
                                            let ii = ' '+ ingi;
                                            ingStringArr.push(temp);
                                            ingI.push(ii);
                                        });
                                        ingStr = ingStringArr.join('/');
                                        ingIStr = ingI.join('/');
                                        let strConcat = ingStr.concat('*', ingIStr);
                                        ingStringArr = [];
                                        ingI = []; 
                                        resolve(strConcat);
                                    }
                                })
                            })
                        }
                        
                        async function getAllRecIng(r){
                            for(id of r){
                                ingStr = await getIngs(id.rec_id);
                                let strArr = ingStr.split('*');
                                let qui = strArr[0]
                                let ins = strArr[1];
                                insArr = ins.split('/');
                                let ingArr = qui.split('/');
                                for (const i of ingArr) {
                                    let quantNum = i.match(regexQuant);
                                    let iStr = i.match(regexStr); 
                                    if(Array.isArray(quantNum)){
                                        quantArr.push(quantNum[0]);
                                    }else{
                                        quantArr.push(quantNum);
                                    }
                                    for (let index = 0; index < iStr.length; index++) {
                                        const element = iStr[index];
                                        if (isNaN(element)) {
                                            finalStr += ' ' + element;
                                        }
                                    }
                                    recIngs.push(finalStr);
                                    finalStr = '';
                                }
                            }
                            let msg = req.flash('msg');
                            session = req.session;
                            let isRated = false;
                            let isSaved = false;
                            // let ratedArr = [];
                            if(session.userId){
                                conn.query('SELECT user_ratedRecs, user_Saved, user_mealPlan FROM users WHERE user_id = ?', [session.userId], (err, rated) => {
                                    if(err){
                                        console.log(err);
                                    }
                                    else{
                                        let getRated = rated[0].user_ratedRecs;
                                        let getSaved = rated[0].user_Saved;
                                        if(getRated){
                                            let ratedArr = getRated.split('/');
                                            if(ratedArr.includes(rId)){
                                                isRated = true;
                                            }
                                        }
                                        if(getSaved){
                                            let savedArr = getSaved.split('/');
                                            if(savedArr.includes(rId)){
                                                isSaved= true;
                                                console.log('isSaved');
                                            }
                                        }
                                        res.render('mealPlanRecView', { recs: recs, recIngs: recIngs, ins: insArr, quantArr: quantArr, msg, id: session.userName, isRated: isRated, isSaved: isSaved});
                                    }
                                })
                                

                            }
                            else{
                                res.render('mealPlanRecView', { recs: recs, recIngs: recIngs, ins: insArr, quantArr: quantArr, msg, id: '', isRated: isRated, isSaved: ''});
                            }
                            
                        }
                        getAllRecIng(recs);
                    }
                })
                         
            }
        })
    } catch (error) {
        res.status(500).json({ message: error.message});
    }
}

exports.mealPlanRecDelete = (req, res) => {
    try{
        session = req.session;
        if(session.userId){
            pool.getConnection((err, conn) => {
                let id = req.params.id;
                conn.query('DELETE FROM mealPlan where rec_id =?', [id], (err, result) => {
                    if(err){
                        console.log('not deleted');
                        res.redirect('/mealplan'); 
                        conn.release();
                    }
                    else{
                        conn.release();
                        res.redirect('/mealplan'); 
                    }
                })
            })
        }
    }
    catch(error){
        res.status(500).json({ message: error.message });

    }
}

exports.mealPlanCurrentBut = (req, res) => {
    Date.prototype.getWeek = function() {
        var date = new Date(this.getTime());
        date.setHours(0, 0, 0, 0);
        // Thursday in current week decides the year.
        date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
        // January 4 is always in week 1.
        var week1 = new Date(date.getFullYear(), 0, 4);
        // Adjust to Thursday in week 1 and count number of weeks from date to week1.
        return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
      };
    try{
        session = req.session;
        if(session.userId){
            pool.getConnection((err, conn) => {
                let today = new Date();
                let dateC = today.getWeek();
                console.log(dateC);
                // SELECT * FROM mealPlan where weekCount = ? ORDER BY dateTime
                conn.query('SELECT * FROM rec INNER JOIN mealPlan ON rec.rec_id=mealPlan.rec_id WHERE mealPlan.weekCount = ? ORDER BY mealPlan.dateTime ', [dateC], (err, mealPlan) => {
                    if(err){
                        console.log(err);  
                    }else{
                        res.render('mealPlan', { title: 'CurrentWeek ', mealPlan: mealPlan, id: session.userName});
                    }
                });
            })
        }
    }catch(error){
        res.status(500).json({ message: error.message });

    }
}
exports.mealPlanPastBut = (req, res) => {
    function getFirstDay(){
        /*let weekBgnDt = new Date();
        let weekEndDt = new Date();
        let wBeginDateLng, wEndDateLng, diffDays,dateCols=[];
    
        if (weekBgnDt.getDay() > 0) {
            diffDays = 0 - weekBgnDt.getDay();
            weekBgnDt.setDate(weekBgnDt.getDate() + diffDays)
        }
        weekEndDt = weekEndDt.setDate(weekBgnDt.getDate() + 6)
    
        wBeginDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', year: 'numeric', 
        month: '2-digit' }).format(weekBgnDt);
        wEndDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', year: 'numeric', month: 
        '2-digit' }).format(weekEndDt);
    
        wBeginDateLng = new Intl.DateTimeFormat('en-GB', { day: 'numeric', year: 'numeric', 
        month: 'long' }).format(weekBgnDt);
        wEndDateLng = new Intl.DateTimeFormat('en-GB', { day: 'numeric', year: 'numeric', 
        month: 'long' }).format(weekEndDt);
    
        console.log(wBeginDate, "-", wBeginDateLng)
        console.log(wEndDate, "-", wEndDateLng)
    
        for(let i=weekBgnDt;i<=weekEndDt;){
        dateCols.push(new Intl.DateTimeFormat('en-GB', { day: 'numeric', year: 'numeric', 
        month: '2-digit' }).format(i));
        i=weekBgnDt.setDate(weekBgnDt.getDate()+1)
        }
        //console.log({wBeginDate,wBeginDateLng,wEndDate,wEndDateLng,dateCols})*/
        let curr = new Date; // get current date
        let first = curr.getDate() - curr.getDay()-12; // First day is the day of the month - the day of the week
        console.log(first);
        let startDate = new Date(curr.setDate(first));
        console.log(startDate);
        //startDate = ""+startDate.getFullYear()+"/"+ (startDate.getMonth() + 1) + "/" + startDate.getDate() 
        startDate = ""+startDate.getDate();
        
        return startDate;
       //alert(startDate+" ,   "+endDate)
    };
    function getLastDay(){
        let curr = new Date; // get current date
        let first = curr.getDate() - curr.getDay()-12; // First day is the day of the month - the day of the week
        let last = first + 5; // last day is the first day + 5
        let endDate = new Date(curr.setDate(last));
        //endDate = "" + (endDate.getMonth() + 1) + "/" + endDate.getDate() + "/" + endDate.getFullYear();
        endDate = ""+endDate.getDate();
        return endDate;
    }

    try{
        session = req.session;
        if(session.userId){
            pool.getConnection((err, conn) => {
                let today = new Date();
                let dateC = getFirstDay();
                let dateD = getLastDay();
                console.log(dateC);
                console.log(dateD);
                // SELECT * FROM mealPlan where weekCount = ? ORDER BY dateTime
                conn.query('SELECT * FROM rec INNER JOIN mealPlan ON rec.rec_id=mealPlan.rec_id WHERE mealPlan.day BETWEEN ? AND ? ORDER BY dateTime', [dateC, dateD], (err, mealPlan) => {
                    if(err){
                        console.log(err);  
                    }else{
                        res.render('mealPlan', { title: 'PastWeek', mealPlan: mealPlan, id: session.userName});
                    }
                });
            })
        }
    }catch(error){
        res.status(500).json({ message: error.message });

    }
}
exports.mealPlanNextBut = (req, res) => {
    /*function getFirstDay(){
        let curr = new Date; // get current date
        let first = curr.getDate() + curr.getDay()-4; // First day is the day of the month - the day of the week
        console.log(first);
        let startDate = new Date(curr.setDate(first));
        console.log(startDate);
        //startDate = ""+startDate.getFullYear()+"/"+ (startDate.getMonth() + 1) + "/" + startDate.getDate() 
        startDate = ""+startDate.getDate() + (startDate.getMonth() + 1);
        
        return startDate;
       //alert(startDate+" ,   "+endDate)
    };
    function getLastDay(){
        let curr = new Date; // get current date
        let first = curr.getDate() + curr.getDay() -4; // First day is the day of the month - the day of the week
        let last = first + 6; // last day is the first day + 5
        let endDate = new Date(curr.setDate(last));
        //endDate = "" + (endDate.getMonth() + 1) + "/" + endDate.getDate() + "/" + endDate.getFullYear();
        endDate = ""+endDate.getDate() + (endDate.getMonth() + 1);
        return endDate;
    }

    try{
        session = req.session;
        if(session.userId){
            pool.getConnection((err, conn) => {
                let today = new Date();
                let dateC = getFirstDay();
                let dateD = getLastDay();
                console.log(dateC);
                console.log(dateD);
                // SELECT * FROM mealPlan where weekCount = ? ORDER BY dateTime
                conn.query('SELECT * FROM rec INNER JOIN mealPlan ON rec.rec_id=mealPlan.rec_id WHERE mealPlan.dayMonth BETWEEN ? AND ? ORDER BY mealPlan.dateTime', [dateC, dateD], (err, mealPlan) => {
                    if(err){
                        console.log(err);  
                    }else{
                        res.render('mealPlan', { title: 'NextWeek', mealPlan: mealPlan, id: session.userName});
                    }
                });
            })
        }
    }catch(error){
        res.status(500).json({ message: error.message });

    }*/
    Date.prototype.getWeek = function() {
        var date = new Date(this.getTime());
        date.setHours(0, 0, 0, 0);
        // Thursday in current week decides the year.
        date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
        // January 4 is always in week 1.
        var week1 = new Date(date.getFullYear(), 0, 4);
        // Adjust to Thursday in week 1 and count number of weeks from date to week1.
        return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
      };
    try{
        session = req.session;
        if(session.userId){
            pool.getConnection((err, conn) => {
                let weekView = req.body.weekViewInp;
                console.log(weekView);
                let date = new Date();
                let dateC = date.getWeek() + 1;
                console.log(dateC);
                conn.query('SELECT * FROM rec INNER JOIN mealPlan ON rec.rec_id=mealPlan.rec_id WHERE mealPlan.weekCount = ? ORDER BY mealPlan.dateTime', [dateC], (err, mealPlan) => {
                    if(err){
                        console.log(err);  
                    }else{
                        res.render('mealPlan', { title: 'Meal Plan', mealPlan: mealPlan, id: session.userName});
                    }
                })
            })
        }
        
    }catch(error){
        res.status(500).json({ message: error.message });

    }
}
/*exports.mealPlanViewSort = (req, res) => {
    Date.prototype.getWeek = function() {
        var date = new Date(this.getTime());
        date.setHours(0, 0, 0, 0);
        // Thursday in current week decides the year.
        date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
        // January 4 is always in week 1.
        var week1 = new Date(date.getFullYear(), 0, 4);
        // Adjust to Thursday in week 1 and count number of weeks from date to week1.
        return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
      };
    try{
        session = req.session;
        if(session.userId){
            pool.getConnection((err, conn) => {
                let weekView = req.body.weekViewInp;
                console.log(weekView);
                if (weekView == 'Past Week'){
                    let date = new Date();
                    let dateC = date.getWeek()-1;
                    console.log(dateC);
                    // SELECT * FROM mealPlan where weekCount = ? ORDER BY dateTime
                    conn.query('SELECT * FROM rec INNER JOIN mealPlan ON rec.rec_id=mealPlan.rec_id WHERE mealPlan.weekCount = ? ORDER BY mealPlan.dateTime ', [dateC], (err, mealPlan) => {
                        if(err){
                            console.log(err);  
                        }else{
                            res.render('mealPlan', { title: 'Meal Plan', mealPlan: mealPlan, id: session.userName});
                        }
                    })
                }
                else if (weekView == 'Current Week'){
                    let date = new Date();
                    let dateC = date.getWeek();
                    console.log(dateC);
                    conn.query('SELECT * FROM rec INNER JOIN mealPlan ON rec.rec_id=mealPlan.rec_id WHERE mealPlan.weekCount = ? ORDER BY mealPlan.dateTime', [dateC], (err, mealPlan) => {
                        if(err){
                            console.log(err);  
                        }else{
                            res.render('mealPlan', { title: 'Meal Plan', mealPlan: mealPlan, id: session.userName});
                        }
                    })
                } else if (weekView == 'Next Week'){
                    let date = new Date();
                    let dateC = date.getWeek() + 1;
                    console.log(dateC);
                    conn.query('SELECT * FROM rec INNER JOIN mealPlan ON rec.rec_id=mealPlan.rec_id WHERE mealPlan.weekCount = ? ORDER BY mealPlan.dateTime', [dateC], (err, mealPlan) => {
                        if(err){
                            console.log(err);  
                        }else{
                            res.render('mealPlan', { title: 'Meal Plan', mealPlan: mealPlan, id: session.userName});
                        }
                    })
                }else{

                }
            })
        }
        
    }catch(error){
        res.status(500).json({ message: error.message });

    }
}*/
exports.mealPlanEditButton = (req, res) => {
    Date.prototype.getWeek = function() {
        var date = new Date(this.getTime());
        date.setHours(0, 0, 0, 0);
        // Thursday in current week decides the year.
        date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
        // January 4 is always in week 1.
        var week1 = new Date(date.getFullYear(), 0, 4);
        // Adjust to Thursday in week 1 and count number of weeks from date to week1.
        return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
      };
    try {
        session = req.session;
        if(session.userId){
            pool.getConnection((err, conn)=>{
                if(err){
                    console.log(err);
                }
                else{
                    let id = req.body.recID;
                    conn.query('SELECT * FROM mealPlan WHERE rec_id = ?', [id], (err, row) => {
                        if(err){
                            console.log(err);
                        }
                        else{
                            let dateTime = req.body.datetimes;
                            let date = new Date(dateTime);
                            let rec = new Recipe.Recipe();
                            let userid = req.session.userId;
                            let id = req.body.recID;
                            let mon = String(date.getMonth());
                            let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                            let days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                            let month = months[date.getMonth()];
                            let day = date.getDate();
                            let day1 = String(date.getDate());
                            let dayMonth = day1 + mon;
                            let sDay = days[date.getDay()];
                            let week = date.getWeek();
                            let hr = date.getHours();
                            let ampm = "am";
                            if( hr > 12 ) {
                                hr -= 12;
                                ampm = "pm";
                            }
                            let min = date.getMinutes();
                            if (min < 10) {
                                min = "0" + min;
                            }
                            let time = hr + ":" + min + ampm;
                            console.log(month, day, sDay, time, date, week, dayMonth);
                            conn.query('UPDATE mealPlan SET user_id = ?, rec_id = ?, month = ?, day = ?, time = ?, sDay = ?, weekCount = ?, dateTime = ?, dayMonth = ? WHERE rec_id =?', [req.session.userId, id, month, day, time, sDay, week, dateTime, dayMonth, id], (err, row) => {
                            if(err){
                                console.log(err);
                            }
                            else{
                                req.flash('msg', 'Successfully rescheduled the meal plan!');
                                res.redirect('/recipes/' + id); 
                            }
                            })
                            conn.release();
                        }
                    })
                }

                    
            })
        }else{
            req.flash('msg', 'You need to login to add the recipe to meal plan!')
            res.redirect('/login');
        }
        
    } catch (error) {
        res.status(500).json({ message: error.message});
    }
}