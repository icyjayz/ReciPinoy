const express = require('express');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const fileUpload = require('express-fileupload');
const flash = require('express-flash');


require('dotenv').config();

const app = express();
const port = process.env. PORT || 3000; //assigning port

app.use('/public', express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: false}));
app.use(express.static('views'));
app.use('/images', express.static(__dirname + "/images"));

app.use(cookieParser());
app.use(session({
    secret: "capstone",
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 1000 * 60 * 60
    }
}));
app.use(fileUpload());
app.use(flash());
app.set('view engine', 'ejs');


const routes = require('./server/routes/route');

// const adminRoutes = require('./server/routes/adminRouter');

app.use('/', routes);
// app.use('/admin', adminRoutes);


app.listen(port, () =>{
    console.log(`Listening on port ${port}...`);
});