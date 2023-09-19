import express from "express"

//middleware
import { requireSignin } from "../middlewares";

const router =express.Router();

//controllers
import {register,login,logout,currentUser,sendTestEmail,ForgotPassword,ResetPassword} from '../controllers/auth'

router.post("/register",register)
router.post("/login", login)
router.get("/logout", logout)
router.get("/current-user", requireSignin, currentUser);
router.get("/send-email", sendTestEmail);
router.post("/forgot-password", ForgotPassword);
router.post("/reset-password", ResetPassword);

module.exports = router;