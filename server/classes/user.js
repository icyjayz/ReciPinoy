const User = class {
    constructor(name, email, password, allergy, restrict){
        this.name = name;
        this.email = email;
        this.password = password;
        this.allergy = allergy;
        this.restrict = restrict;
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

    getUserAllergy(){
        return this.allergy;
    }

    getUserRestrict(){
        return this.restrict;
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


module.exports = {
    User : User,
    UserLogin : UserLogin,
    AdminLogin : AdminLogin
}