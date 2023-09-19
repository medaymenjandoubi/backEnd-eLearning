import express from "express"

//middleware
import { requireSignin } from "../middlewares";

const router = express.Router();

//controllers
import {makeInstructor,getAccountStatus,currentInstructor,instructorCourses,instructorBalance,payoutSettings} from '../controllers/instructor.js'

router.post('/make-instructor',requireSignin, makeInstructor)
router.get("/get-account-status",requireSignin, getAccountStatus)
router.get("/current-instructor", requireSignin,currentInstructor)

router.get("/instructor-courses",requireSignin,instructorCourses);

router.get('/instructor/balance',requireSignin,instructorBalance)
router.get('/instructor/payout-settings',requireSignin,payoutSettings)
module.exports = router;