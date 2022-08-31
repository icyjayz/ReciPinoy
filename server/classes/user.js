const User = class {
    constructor(name, email, password){
        this.name = name;
        this.email = email;
        this.password = password;
    }

    getUserName(){
        return this.name;
    }

    getUserEmail(){
        return this.email;
    }

    getUserPassword(){
        return this.password;
    }
}

const UserLogin = class{
    constructor(email, password){
        this.email = email;
        this.password = password;
    }

    getLoginEmail(){
        return this.email;
    }

    getLoginPassword(){
        return this.password;
    }

}

const AdminLogin = class{
    constructor(email, password){
        this.email = email;
        this.password = password;
    }

    getLoginEmail(){
        return this.email;
    }

    getLoginPassword(){
        return this.password;
    }

}

const Admin = class {
    constructor(name, email, password){
        this.name = name;
        this.email = email;
        this.password = password;
    }

    getAdminName(){
        return this.name;
    }

    getAdminEmail(){
        return this.email;
    }

    getAdminPassword(){
        return this.password;
    }
}

module.exports = {
    User : User,
    UserLogin : UserLogin,
    AdminLogin : AdminLogin
}