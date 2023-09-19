import express from "express"
import formidable from "express-formidable";
//middleware
import { isInstructor, requireSignin ,isEnrolled} from "../middlewares";

const router = express.Router();

//import from controllers
import {uploadImage,removeImage,create,update,readSingleCourse,uploadVideo,
        removeVideo,addLesson,removeLesson,updateLesson,publish,unpublish,
        courses,checkEnrollment,freeEnrollment,paidEnrollment,stripeSuccess,
        userCourses,markCompleted,listCompleted,markIncompleted,countStudents} from '../controllers/course.js'


router.get("/courses", courses)
//image
router.post('/course/upload-image',uploadImage)
router.post('/course/remove-image',removeImage)

//course 
router.post('/course',requireSignin,isInstructor,create)

router.get(`/course/:slug`,readSingleCourse);
router.put('/course/:slug',requireSignin,update)
//publish unpublish course routes 
router.put('/course/publish/:courseId',requireSignin,publish)
router.put('/course/unpublish/:courseId',requireSignin,unpublish)

//video
router.post('/course/video-upload/:instructorId',requireSignin,formidable(),uploadVideo)
router.post('/course/video-remove/:instructorId',requireSignin,removeVideo)


//lesson
router.post("/course/lesson/:slug/:instructorId",requireSignin,addLesson);
router.put("/course/lesson/:slug/:instructorId",requireSignin,updateLesson);
router.put("/course/:slug/:lessonId",requireSignin,removeLesson)

router.get("/check-enrollment/:courseId",requireSignin,checkEnrollment)

//course enrollment routes
router.post("/free-enrollment/:courseId",requireSignin,freeEnrollment)
router.post("/paid-enrollment/:courseId",requireSignin,paidEnrollment)
router.get("/stripe-success/:courseId", requireSignin, stripeSuccess);


//get routes for all & single courses of a user 
router.get("/user-courses",requireSignin,userCourses);
router.get(`/user/course/:slug`,requireSignin,isEnrolled,readSingleCourse);

// routes for complete&incomplete lessons managment
router.post("/mark-completed",requireSignin,markCompleted)
router.post("/mark-incompleted",requireSignin,markIncompleted)
router.post("/list-completed",requireSignin,listCompleted)

//route to count enrolled users in course
router.post('/instructor/student-count',requireSignin,countStudents)
module.exports = router;