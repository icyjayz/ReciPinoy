const bcrypt = require('bcrypt');
const pool = require('../classes/db');
const User = require('../classes/user');
const Recipe = require('../classes/recipe');
let recId;

exports.adminPage = (req, res) => {
    try{
        session = req.session;
        if(session.adminId){
            res.render('adminHome', { title: 'Admin HomePage', id: session.adminName});
        }
        else{
            console.log('admin not logged in...\n');
            let msg = req.flash('msg');
            res.render('admin', { title: 'Admin Login', msg});
        }
    }
    catch(error){
        res.status(500).json({ message: error.message });
    }
}

exports.getAdminData = (req, res) => {
    try{
        pool.getConnection((err, conn) => {
            if(err){
                console.log(err);
            }
            else{
                let admin = new User.AdminLogin;
                admin.email = req.body.adminEmailInp;
                admin.password = req.body.adminPasswordInp;
                //let email = req.body.adminEmailInp;
                //let password = req.body.adminPasswordInp;
                conn.query('SELECT * FROM admins WHERE admin_email = ?', [admin.getLoginEmail()], (err, result) =>{
                    
                    if(err){
                        console.log(err, '\n');
                        conn.release();
                    }
                    else{
                        if(result.length > 0){
                            bcrypt.compare(admin.getLoginPassword(), result[0].admin_password,(err, row) => {
                                if(row){
                                    session = req.session;
                                    session.adminId = result[0].admin_id;
                                    session.adminName = result[0].admin_name;
                                    console.log(req.session, '\n');
                                    conn.release();
                                    res.redirect('/admin/home');
                                    

                                }
                                else{
                                    // res.send({ message: 'invalid credentials!!!'});
                                    req.flash('msg', 'Invalid credentials!')
                                    //console.log('Invalid credentials!\n');
                                    conn.release();
                                    res.redirect('/admin');
                                }
                            })
                        }
                    
                    }
                })
            }
        })
    }
    catch(error){
        res.json({ message: error.message });
    }
    
}

exports.adminHome = (req, res) => {
    try{
        session = req.session;
        if(session.adminId){
            pool.getConnection((err, conn) => {
                if(err){
                    console.log(err);
                }
                else{
                    conn.query('SELECT COUNT(*) AS rec_count FROM rec', (err, rec) =>{
                        if(err){
                            console.log(err);
                        }
                        else{
                            let r = rec[0].rec_count;
                            conn.query('SELECT COUNT(*) AS user_count FROM users', (err, user) =>{
                                if(err){
                                    console.log(err);
                                }
                                else{
                                    let u = user[0].user_count;
                                    conn.release();
                                    res.render('adminHome', {title: 'Admin Homepage', id: session.adminName, rec: r, user: u});
                                }
                            })
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

exports.adminLogout = (req, res) => { 
    try{
        if(req.session.adminId){
            req.session.destroy();
            console.log('session admin destroy');
            console.log(req.session, '\n');
            //conn.destroy();
            res.redirect('/');
            
        }
    }
    catch(error){
        res.status(500).json({ message: error.message });

    }
    
}

exports.adminRecipes = (req, res) => {
    try{
        session = req.session;
        if(session.adminId){
            pool.getConnection((err, conn) => {
                if(err){
                    console.log('error in adminrecipes...\n');
                }
                else{
                    conn.query('SELECT * FROM rec', (err, recs) => {
                        if(err){
                            console.log('cannot fetch recipes in db...\n');
                        }
                        else{
                            let recIngs = [];
                            let ingStringArr = [];
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
                                                ingStr = ingStringArr.join(',');
                                                //tempArr.push(ingStr);
                                                ingStringArr = []; 
                                                resolve(ingStr);
                                            }
                                        })
                                })
                            }
                            async function getAllRecIng(r){
                                for(id of r){
                                    ingStr = await getIngs(id.rec_id);
                                    recIngs.push(ingStr);
                                }
                                //console.log(recIngs);
                                conn.release();
                                let msg = req.flash('msg');
                                res.render('adminRecipe', { title: 'Recipes', recs: recs, recIngs: recIngs, msg});
                            }
                            getAllRecIng(recs);
                        }
                    })
                             
                }
            })
        }
        else{
            console.log('admin not logged in...\n');
            let msg = req.flash('msg');
            res.render('admin', { title: 'Admin Login', msg});
        }
    }
    catch(error){
        res.status(500).json({ message: error.message });
    }
}

exports.submitRecipe = (req, res) => {
    try{
        session = req.session;
        if(session.adminId){
            pool.getConnection((err, conn) =>{
                if(err){
                    console.log(err, '\n');
                    conn.release();
                }
                else{
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
                    rec.img = req.files.recImgInp;
                    let recImgName = rec.getRecImg().name;
                    let mString = '';
                    if(Array.isArray(rec.getRecMTime())){
                        rec.getRecMTime().forEach(time => {
                            mString += time + ', ';
                        });
                    }else{
                        mString = rec.getRecMTime();
                    }
                    if(rec.getRecImg().mimetype == "image/jpeg" || rec.getRecImg().mimetype == "image/png"){
                        rec.getRecImg().mv('images/' + recImgName, (err) => {
                            res.status(500).send(err);
                        })
                    }
                    else{
                        let msg = req.flash('msg');
                        res.render('adminCreateRecipe', {title: 'Create Recipe', ing: rows, msg});
                        //console.log('invald file format..\n');
                    }
                    conn.query('INSERT INTO rec(rec_name, rec_desc, rec_process, rec_categ, rec_time, rec_serving, rec_src, rec_vid, rec_cal, rec_mealTime, rec_image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [rec.getRecName(), rec.getRecDesc(), rec.getRecPrc(), rec.getRecCateg(), rec.getRecTime(), rec.getRecSrv(), rec.getRecSrc(), rec.getRecVid(), rec.getRecCal(), mString, recImgName], (err, result) => {
                        if(err){
                            console.log(err, '\n');
                            conn.release();
                        }else{
                            recId = result.insertId;
                            console.log(recId);
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
                                conn.query('INSERT INTO recIng(recId, ingId, ingQuant, ingUnit, ingIns) VALUES (?, ?, ?, ?, ?)', [recId, ii, qf, ingUnit, ingIns], (err, row) => {
                                    if(err){
                                        console.log(err, '\n');
                                        conn.release();
                                    }
                                    else{
                                        console.log('new ing added + recing inserted...\n');
                                    }
                                })
                                
                            }

                            for(let i = 0; i < ingNum; i++){
                                let ingQuant = ing.getIngQuant()[i];
                                let ingUnit = ing.getIngUnit()[i];
                                let ingName = ing.getIngName()[i];
                                let ingIns = ing.getIngIns()[i];
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
                                        conn.query('INSERT INTO recIng(recId, ingId, ingQuant, ingUnit, ingIns) VALUES (?, ?, ?, ?, ?)', [recId, ii, qf, ingUnit, ingIns], (err, row) => {
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
                            res.redirect('/admin/recipes'); 
                        }
                    })
                }
            })
        }
        else{
            console.log('admin not logged in...\n');
            let msg = req.flash('msg');
            res.render('admin', { title: 'Admin Login', msg});
        }
    }
    catch(error){
        res.json({ message: error.message });
    }
}

exports.adminRecipeCreate = (req, res) => {
    try{
        session = req.session;
        if(session.adminId){
            pool.getConnection((err, conn) => {
                if(err){
                    console.log(err, '\n');
                }
                else{
                    conn.query('SELECT * FROM ing', (err, rows) =>{
                        if(err){
                            console.log(err, '\n');
                        }
                        else{
                            let msg = req.flash('msg');
                            res.render('adminCreateRecipe', {title: 'Create Recipe', ing: rows, msg});
                        }
                    })
                }
            })
            
        }
        else{
            console.log('admin not logged in...\n');
            let msg = req.flash('msg');
            res.render('admin', { title: 'Admin Login', msg});
        }
    }
    catch(error){
        res.status(500).json({ message: error.message });

    }
    
}

exports.adminRecipeDelete = (req, res) => {
    try{
        session = req.session;
        if(session.adminId){
            pool.getConnection((err, conn) => {
                let rId = req.params.id;
                conn.query('DELETE rec, recing FROM recing INNER JOIN rec WHERE recing.recId=rec.rec_id AND recing.recId = ?', [rId], (err, result) => {
                    if(err){
                        console.log('not deleted');
                        res.redirect('/admin/recipes'); 
                        conn.release();
                    }
                    else{
                        conn.release();
                        res.redirect('/admin/recipes'); 
                    }
                })
            })
        }
        else{
            console.log('admin not logged in...\n');
            let msg = req.flash('msg');
            res.render('admin', { title: 'Admin Login', msg});
        }
    }
    catch(error){
        res.status(500).json({ message: error.message });

    }
}

exports.adminRecipeEdit = (req, res) => {
    try {
        session = req.session;
        if(session.adminId){
            let rId = req.params.id;
            pool.getConnection((err, conn) => {
                if(err){
                    console.log(err, '\n');
                    conn.release();   
                }
                else{
                    conn.query('SELECT * FROM rec WHERE rec_id = ?', [rId], (err, row) =>{
                        if(err){
                            console.log(err, '\n');
                            conn.release();  
                        }
                        else{
                            //console.log(row);
                            conn.query('SELECT recing.*, ing_name FROM `recing` INNER JOIN ing ON recing.ingId=ing.ing_id WHERE recing.recId = ?',[rId], (err, ingRow) =>{
                                if(err){
                                    console.log(err, '\n');
                                    conn.release();  
                                }
                                else{
                                    res.render('adminEditRecipe', {title: 'Edit Recipe', rec: row, ing: ingRow});
                                    conn.release();  
                                }
                            })
                           
                            
                        }
                        
                    })
                }
            })
        }
        else{
            console.log('admin not logged in...\n');
            let msg = req.flash('msg');
            res.render('admin', { title: 'Admin Login', msg});
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

exports.adminRecipeSubmitEdit = (req,res) => {
try {
    session = req.session;
    if(session.adminId){
        pool.getConnection((err, conn)=>{
            if(err){
                console.log(err, '\n');
            }
            else{
                let rId = req.params.id;
                conn.query('DELETE FROM recing WHERE recId = ?', [rId], (err, row) =>{
                    if(err){
                        console.log(err, '\n');
                    }
                    else{
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
                        rec.img = req.files.recImgInp;
                        let recImgName = rec.getRecImg().name;
                        let mString = '';
                        if(Array.isArray(rec.getRecMTime())){
                            rec.getRecMTime().forEach(time => {
                                mString += time + ', ';
                            });
                        }else{
                            mString = rec.getRecMTime();
                        }
                        if(rec.getRecImg().mimetype == "image/jpeg" || rec.getRecImg().mimetype == "image/png"){
                            rec.getRecImg().mv('images/' + recImgName, (err) => {
                                res.status(500).send(err);
                            })
                        }
                        else{
                            console.log('invald file format..\n');
                        }
                        conn.query('UPDATE `rec` SET `rec_name`= ?,`rec_desc`= ?,`rec_process`= ?,`rec_categ`= ?,`rec_time`= ? ,`rec_serving`= ?,`rec_src`= ?,`rec_vid`= ?,`rec_cal`= ?,`rec_mealTime`= ?,`rec_image`= ? WHERE rec_id = ?', [rec.getRecName(), rec.getRecDesc(), rec.getRecPrc(), rec.getRecCateg(), rec.getRecTime(), rec.getRecSrv(), rec.getRecSrc(), rec.getRecVid(), rec.getRecCal(), mString, recImgName, rId], (err, recs) => {
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
                                    conn.query('INSERT INTO recIng(recId, ingId, ingQuant, ingUnit, ingIns) VALUES (?, ?, ?, ?, ?)', [rId, ii, qf, ingUnit, ingIns], (err, row) => {
                                        if(err){
                                            console.log(err, '\n');
                                            conn.release();
                                        }
                                        else{
                                            console.log('new ing added + recing inserted...\n');
                                        }
                                    })
                                    
                                }

                                for(let i = 0; i < ingNum; i++){
                                    let ingQuant = ing.getIngQuant()[i];
                                    let ingUnit = ing.getIngUnit()[i];
                                    let ingName = ing.getIngName()[i];
                                    let ingIns = ing.getIngIns()[i];
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
                                            conn.query('INSERT INTO recIng(recId, ingId, ingQuant, ingUnit, ingIns) VALUES (?, ?, ?, ?, ?)', [rId, ii, qf, ingUnit, ingIns], (err, row) => {
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
                                
                                res.redirect('/admin/recipes');
                            }
                        })
                        
                    }
                })
            }
        })
    }
} catch (error) {
    res.json({ message: error.message });
}
}

exports.adminSearch = (req, res) => {
    try {
        session = req.session;
        if(session.adminId){
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
                        else if(result){
                           res.render('adminSearchResults', {title: 'Search Results', recs: result});
                        }
                        else{
                           // let msg = req.flash('msg', 'No recipes found!');
                            res.render('adminSearchResults', {title: 'Search Results', recs: result});
                        }   
                    })
                }
            })
        }
        else{
            console.log('admin not logged in...\n');
            let msg = req.flash('msg');
            res.render('admin', { title: 'Admin Login', msg});
        }
        
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

exports.adminRecipeView = (req,res) => {
    try {
        session = req.session;
        if(session.adminId){
            pool.getConnection((err, conn) => {
                if(err){
                    console.log('error in adminrecipes...\n');
                }
                else{
                    let rId = req.params.id;
                    conn.query('SELECT * FROM rec WHERE rec_id = ?',[rId], (err, recs) => {
                        if(err){
                            console.log('cannot fetch recipes in db...\n');
                        }
                        else{
                            let recIngs = [];
                            let ingStringArr = [];
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
                                                ingStr = ingStringArr.join(',');
                                                //tempArr.push(ingStr);
                                                ingStringArr = []; 
                                                resolve(ingStr);
                                            }
                                        })
                                })
                            }
                            async function getAllRecIng(r){
                                for(id of r){
                                    ingStr = await getIngs(id.rec_id);
                                    recIngs.push(ingStr);
                                }
                                //console.log(recIngs);
                                conn.release();
                                res.render('adminRecipeView', { title: recs.rec_name, recs: recs, recIngs: recIngs});
                            }
                            getAllRecIng(recs);
                        }
                    })
                             
                }
            })
        }
        else{
            console.log('admin not logged in...\n');
            let msg = req.flash('msg');
            res.render('admin', { title: 'Admin Login', msg});
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

exports.adminUsers = (req, res) => {
    try {
        session = req.session;
        if(session.adminId){
            pool.getConnection((err, conn) => {
                if(err){
                    console.log(err, '\n');
                }
                else{
                    conn.query('SELECT * FROM users', (err, users) =>{
                        if(err){
                            console.log(err, '\n');
                        }
                        else{
                            res.render('adminUsers', { title: 'Users', users: users});
                        }
                    })
                }
            })
        }
        else{
            console.log('admin not logged in...\n');
            let msg = req.flash('msg');
            res.render('admin', { title: 'Admin Login', msg});
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}
