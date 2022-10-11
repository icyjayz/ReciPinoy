const bcrypt = require('bcrypt');
const pool = require('../classes/db');
const User = require('../classes/user');
const Recipe = require('../classes/recipe');
let recId;

exports.adminPage = (req, res) => {
    try{
        session = req.session;
        if(session.adminId){
            // res.render('adminHome', { title: 'Admin HomePage', id: session.adminName});
            res.redirect('/admin/home');
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
                                                ingStr = ingStringArr.join('/');
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
                    conn.query('SELECT * FROM rec WHERE rec_name = ?', [req.body.recNameInp], (err, rec) => {
                        if(err){
                            console.log(err, '\n');
                            conn.release();
                        }
                        else if(rec[0]){
                            conn.release();
                            req.flash('msg', 'The database has recipe for this dish already!');
                            res.redirect('/admin/recipes/create');
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
                                    if(err){
                                        res.status(500).send(err);
                                    }
                                })
                            }
                            else{
                                let msg = req.flash('msg');
                                res.render('adminCreateRecipe', {title: 'Create Recipe', ing: rows, msg});
                            }
                            conn.query('INSERT INTO rec(rec_name, rec_desc, rec_process, rec_categ, rec_time, rec_serving, rec_src, rec_vid, rec_cal, rec_mealTime, rec_image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [rec.getRecName(), rec.getRecDesc(), rec.getRecPrc(), rec.getRecCateg(), rec.getRecTime(), rec.getRecSrv(), rec.getRecSrc(), rec.getRecVid(), rec.getRecCal(), mString, recImgName], (err, result) => {
                                if(err){
                                    console.log(err, '\n');
                                    conn.release();
                                }else{
                                    recId = result.insertId;
                                    let ing = new Recipe.Ing();
                                    let ingNum = req.body.ingNum;
                                    ing.quant = JSON.parse(req.body.qval);
                                    ing.name = JSON.parse(req.body.idval);
                                    ing.unit = JSON.parse(req.body.uval);
                                    ing.ins = JSON.parse(req.body.insval);
                                    let newIngArr = [];
                              
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
                                    
                                    function ingLoop(i) {
                                        return new Promise((resolve, reject) => {
                                            let newIngStr = '';
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
                                                                newIngStr = '';
                                                                resolve(newIngStr);
                                                            }
                                                        })
                                                    }
                                                    else{
                                                        insertRecIng(ingName, qf, ingUnit, ingIns).then(() => {
                                                            newIngStr = ingName;
                                                            resolve(newIngStr);
                                                        });
                                                        
                                                    }
                                                })
                                        })
                                    }
                                    let ingStr = '';
                                    async function updateIng() {
                                        for (let index = 0; index < ingNum; index++) {
                                            ingStr = await ingLoop(index);
                                            console.log('ingStr: ', ingStr);
                                            if(ingStr != ''){
                                                newIngArr.push(ingStr); 
                                            }
                                        }
                                    }
                                    updateIng().then(() => {
                                        console.log(newIngArr + ' before if');
                                        if(newIngArr.length > 0){
                                            res.render('updateIng', {ings: newIngArr});
                                        }
                                        else{
                                            req.flash('msg', 'New recipe added!');
                                            res.redirect('/admin/recipes'); 
                                        }
                                    });
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
    }
    catch(error){
        res.json({ message: error.message });
    }
}


exports.updateIng = (req,res) =>{
    try {
        let ingName = JSON.parse(req.body.ingName);
        let fa = JSON.parse(req.body.faValues);
        let dr = JSON.parse(req.body.drValues);
        console.log(fa);
        console.log(ingName);
        console.log(dr);
        for (let index = 0; index < ingName.length; index++) {
            let name = ingName[index];
            let restrict = dr[index];
            let allergy = fa[index];

            if(restrict == 'none,'){
                restrict = null;
            }

            if(allergy == 'none,'){
                allergy = null;
            }
            
            pool.getConnection((err, conn) =>{
                if (err) {
                    console.log(err);
                } else {
                    conn.query('UPDATE `ing` SET `ing_restrict`= ?,`ing_allergy`= ? WHERE ing_name = ?', [restrict, allergy, name], (err, row) =>{
                        if (err) {
                            console.log(err);
                        } else {
                            console.log('ing updated!');
                        }
                    })
                }
            })
        }
        req.flash('msg', 'New recipe added!');
        res.redirect('/admin/recipes'); 

    } catch (error) {
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
                        // console.log('not deleted');
                        req.flash('msg', 'recipe deletion failed!')
                        res.redirect('/admin/recipes'); 
                        conn.release();
                    }
                    else{
                        conn.release();
                        req.flash('msg', 'recipe successfully deleted!')
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
                                if(err){
                                    res.status(500).send(err);
                                }
                            })
                        }
                        else{
                            let msg = req.flash('msg');
                            res.render('adminCreateRecipe', {title: 'Create Recipe', ing: rows, msg});
                        }
                        conn.query('UPDATE `rec` SET `rec_name`= ?,`rec_desc`= ?,`rec_process`= ?,`rec_categ`= ?,`rec_time`= ? ,`rec_serving`= ?,`rec_src`= ?,`rec_vid`= ?,`rec_cal`= ?,`rec_mealTime`= ?,`rec_image`= ? WHERE rec_id = ?', [rec.getRecName(), rec.getRecDesc(), rec.getRecPrc(), rec.getRecCateg(), rec.getRecTime(), rec.getRecSrv(), rec.getRecSrc(), rec.getRecVid(), rec.getRecCal(), mString, recImgName, rId], (err, recs) => {
                            if(err){
                                console.log(err, '\n');
                            }
                            else{
                                conn.query('DELETE FROM recing WHERE recId = ?', [rId], (err, row) =>{
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
                                                ingStr = ingStringArr.join('/');
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
                                conn.release();
                                //let msg = req.flash('msg');
                                //res.render('adminRecipe', { title: 'Recipes', recs: recs, recIngs: recIngs, msg});
                                res.render('adminSearchResults', {title: 'Search Results', recs: result, recIngs: recIngs});
                            }
                            getAllRecIng(result);
                        }
                        else{
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
                                                ingStr = ingStringArr.join('/');
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
                        if(session.adminId){
                            conn.release();
                            res.render('adminSearchResults', {title: 'Filter Results', recs: filter, id: session.userName});
                        }
                        else{
                            conn.release();
                            res.render('adminSearchResults', {title: 'Filter Results', recs: filter, id: ''});
                    }}
                }) 
            }
            else if(mealTime == 31){
                conn.query('SELECT * FROM rec WHERE rec_time IN (40, 45,47,48,49,50,55,56,57,58,59, "1 hr%")  ORDER BY rec_time ASC LIMIT 35;',(err, filter) =>{
                    if(err){
                        console.log(err);
                    }else{
                        console.log(mealTime);
                        session = req.session;
                        if(session.adminId){
                            conn.release();
                            res.render('adminSearchResults', {title: 'Filter Results', recs: filter, id: session.userName});
                        }
                        else{
                            conn.release();
                            res.render('adminSearchResults', {title: 'Filter Results', recs: filter, id: ''});
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
                        if(session.adminId){
                            conn.release();
                            res.render('adminSearchResults', {title: 'Filter Results', recs: filter, id: session.userName});
                        }
                        else{
                            conn.release();
                            res.render('adminSearchResults', {title: 'Filter Results', recs: filter, id: ''});
                    }}
                }) 
            }
            else if (mealTime =="1 hr and 31 minutes"){
                conn.query('SELECT * FROM rec WHERE rec_time > "1 h%" ORDER BY rec_time ASC LIMIT 35;',(err, filter) =>{
                    if(err){
                        console.log(err);
                    }else{
                        console.log(mealTime);
                        session = req.session;
                        if(session.adminId){
                            conn.release();
                            res.render('adminSearchResults', {title: 'Filter Results', recs: filter, id: session.userName});
                        }
                        else{
                            conn.release();
                            res.render('adminSearchResults', {title: 'Filter Results', recs: filter, id: ''});
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
                        if(session.adminId){
                            conn.release();
                            res.render('adminSearchResults', {title: 'Filter Results', recs: filter, id: session.userName});
                        }
                        else{
                            conn.release();
                            res.render('adminSearchResults', {title: 'Filter Results', recs: filter, id: ''});
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
                        if(session.adminId){
                            conn.release();
                            res.render('adminSearchResults', {title: 'Filter Results', recs: filter, id: session.userName});
                        }
                        else{
                            conn.release();
                            res.render('adminSearchResults', {title: 'Filter Results', recs: filter, id: ''});
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
                        if(session.adminId){
                            conn.release();
                            res.render('adminSearchResults', {title: 'Filter Results', recs: filter, id: session.userName});
                        }
                        else{
                            conn.release();
                            res.render('adminSearchResults', {title: 'Filter Results', recs: filter, id: ''});
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
                        if(session.adminId){
                            conn.release();
                            res.render('adminSearchResults', {title: 'Filter Results', recs: filter, id: session.userName});
                        }
                        else{
                            conn.release();
                            res.render('adminSearchResults', {title: 'Filter Results', recs: filter, id: ''});
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
                            if(session.adminId){
                                conn.release();
                                res.render('adminSearchResults', {title: 'Filter Results', recs: filter, id: session.userName});
                            }
                            else{
                                conn.release();
                                res.render('adminSearchResults', {title: 'Filter Results', recs: filter, id: ''});
                        }}
                    })
                }
            }
        })
    }catch (error) {
        res.status(500).json({ message: error.message});
    }
}
