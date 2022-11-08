const express = require('express');

const router = express.Router();
const userController = require('../controllers/userController');
const adminController = require('../controllers/adminController');

//user routes
router.get('/', userController.indexPage);
router.get('/register', userController.registerPage);
router.post('/register', userController.getRegData);
router.get('/login', userController.loginPage);
router.post('/login', userController.getLoginData);
router.get('/logout', userController.userLogout);
router.get('/home', userController.userHome);
router.get('/verify', userController.otpPage);
router.post('/verify', userController.userVerified);
router.get('/forgot-password', userController.userForgotPwd);
router.post('/forgot-password', userController.userSendPwdEmail);
router.get('/reset-password', userController.userResetPwd);
router.post('/reset-password', userController.userUpdatePwd);
router.post('/search', userController.userSearch);
router.post('/search/filter', userController.getFilter);
router.get('/recipes/:id', userController.userRecipeView);
router.post('/recipes/:id', userController.userSaveRec);
router.post('/recipes/unsave/:id', userController.UnsavedButton);
router.post('/recipes/rate/:id', userController.userRateRec);
router.get('/recommend', userController.userRecommend);
router.post('/recommend', userController.userRecommendRecipe);
router.get('/recipes', userController.userRecipes);
router.post('/recipes', userController.userSortRecipes);
router.post('/recommend/search', userController.userRecommAC);
router.post('/recommend/new', userController.userRecommAdd);
router.get('/profile', userController.profilePage);
router.post('/profile', userController.updateProfile);
router.get('/grocery-list', userController.groceryPage);
router.post('/grocery-list', userController.addGrocery);
router.post('/grocery-list/add', userController.addItem);
router.get('/saved', userController.userSavedRecipes);
router.get('/saved/:id', userController.userSavedRView);
router.get('/saved/edit/:id', userController.userSavedEdit);
router.post('/saved/edit/:id', userController.userSavedSubEdit);
router.get('/saved/delete/:id', userController.userSavedDelete);
router.post('/mealPlan', userController.mealPlan);
router.post('/mealPlan/edit', userController.mealPlanEditButton);
router.get('/mealPlan', userController.mealPlanRec);
router.post('/mealPlan/past', userController.mealPlanPastBut);
router.post('/mealPlan/current', userController.mealPlanCurrentBut);
router.post('/mealPlan/next', userController.mealPlanNextBut);
router.get('/mealPlan/:id', userController.mealPlanRecView);
router.get('/mealPlan/delete/:id', userController.mealPlanRecDelete);


//admin routes
router.get('/admin', adminController.adminPage);
router.post('/admin', adminController.getAdminData);
router.get('/admin/home', adminController.adminHome);
router.get('/admin/logout', adminController.adminLogout);
router.get('/admin/recipes', adminController.adminRecipes);
router.get('/admin/recipes/create', adminController.adminRecipeCreate);
router.post('/admin/recipes/create', adminController.submitRecipe);
router.get('/admin/recipes/edit/:id', adminController.adminRecipeEdit);
router.get('/admin/recipes/delete/:id', adminController.adminRecipeDelete);
router.post('/admin/recipes/edit/:id', adminController.adminRecipeSubmitEdit);
router.post('/admin/recipes/search', adminController.adminSearch);
router.post('/admin/recipes/search/filter', adminController.getFilter);
router.get('/admin/recipes/:id', adminController.adminRecipeView);
router.get('/admin/users', adminController.adminUsers);
router.post('/admin/recipes/create/ing', adminController.updateIng);

module.exports = router