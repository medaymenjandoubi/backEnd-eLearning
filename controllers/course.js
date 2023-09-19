import AWS from 'aws-sdk'
import Course from '../models/course';
import User from '../models/auth'
import slugify from 'slugify';
const stripe = require("stripe")(process.env.STRIPE_SECRET)

var { nanoid } = require("nanoid");
import {readFileSync} from "fs"
import Completed from '../models/completed';
const awsConfig = {
    accesKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccesKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    apiVersion: process.env.AWS_API_VERSION,
}
const S3 = new AWS.S3(awsConfig)
export const uploadImage = (req,res) => {
    //console.log(req.body)
    try {
        const {image} = req.body
        if (!image) return res.status(400).send("No Image")

        // prepare the image
        const base64Data = new Buffer.from(image.replace(/^data:image\/\w+;base64,/,""),"base64");
        const type = image.split(';')[0].split("/")[1];
        //image params 
        const params = {
            Bucket: "rapydlearn-bucket",
            Key:`${nanoid()}.${type}`,
            Body: base64Data,
            ACL: 'public-read',
            ContentEncoding:"base64",
            ContentType: `image/${type}`,
        }

        //upload to s3
        S3.upload(params,(err, data) => {
            if (err) {
                console.log(err)
                return res.sendStatus(400);
            }
            console.log(data)
            res.send(data)
        });
    } catch (err) {
        console.log(err)
    }
}
export const removeImage = async (req,res) => {
    try {
        const {image} = req.body
        //console.log(image)
        //return;
        //const {image} = req.body
        //console.log("test",image)
        const params ={
            Bucket: image.Bucket,
            Key: image.Key,
        }
        S3.deleteObject(params, (err,data) => {
            if (err){
                console.log(err)
                res.sendStatus(400);
            }
            res.send({ok: true})
        })
    } catch (err) {
        console.log(err)
    }
}
export const create = async (req,res) => {
   /*  console.log('Create course ',req.body.name)
    return; */
    try {
        const AlreadyExist = await Course.findOne({
            slug: slugify(req.body.name.toLowerCase())
        })
        if (AlreadyExist){return res.status(400).send("Title is Taken ")}
        if (!req.body.paid){req.body.price = 0}
        const course = new Course({
            slug: slugify(req.body.name),
            instructor:req.auth._id,
            ...req.body,
        }).save();
        res.json(course);
    } catch (err) {
        console.log(err);
        return res.status(400).send("Course Creation failed. Please try again")
    }
}
export const readSingleCourse= async (req,res)=> {
    try {
        const course= await Course.findOne({slug: req.params.slug}).populate('instructor',"_id name").exec();
        res.json(course)
    } catch (err) {
        console.log(err)
    }
}
export const uploadVideo = async(req,res) => {
    /* console.log("req.user._id", req.auth._id)
    console.log("req.params.instructorId",req.params.instructorId);
    return; */
    try {

        if (req.auth._id != req.params.instructorId){
            return res.status(400).send("Unauthorized");
        }
        const { video }= await req.files
        //console.log(video)
        if (!video) return res.status(400).send("No video")
        //else if video received in back-end we configure video params to save it in S3
        const params = {
            Bucket: "rapydlearn-bucket",
            Key: `${nanoid()}.${video.type.split("/")[1]}`,
            Body: readFileSync(video.path),
            ACL: "public-read",
            ContentType: video.type,
        }
        //upload video to s3
        S3.upload(params, (err,data)=> {
            if (err) {
                console.log(err)
                res.sendStatus(400)
            }
            console.log(data);
            res.send(data);

        })

    } catch (err) {
        console.log(err)
    }

}
export const removeVideo = async(req,res) => {
    
    try {
        if (req.auth._id != req.params.instructorId){
            return res.status(400).send("Unauthorized");
        }
        const {Bucket, Key} = req.body
        //console.log("test",image)
        if (!Key) return res.status(400).send("No video to remove ")
        const params ={
            Bucket,
            Key,
        }
        S3.deleteObject(params, (err,data) => {
            if (err){
                console.log(err)
                res.sendStatus(400);
            }
            res.send({ok: true})
        })
    } catch (err) {
        console.log(err)
    }
}
export const addLesson = async(req,res) => {
    try {
        const {slug,instructorId} = req.params;
        const{title,content,video} = req.body;
         if (req.auth._id != instructorId){
            return res.status(400).send("Unauthorized")
         }
         console.log(slug)
         const updated = await Course.findOneAndUpdate(
            {slug},
            {$push: {lessons: {title,content,video,slug: slugify(title)}}}
         ,{new : true }
         ).populate('instructor',"_id name").exec();
         res.json(updated);
    } catch (err) {
        console.log(err)
        return res.status(400).send("Add lesson failed ");
    }
}
export const update =async(req,res)=>{
    try {
        console.log(req.body)
        const {slug}= req.params
        //console.log(slug)
        const course = await Course.findOne({slug}).exec();
        //console.log(course)
        if (req.auth._id!= course.instructor) {
            return res.status(400).send("Unauthorized")
        }
        const updated = await Course.findOneAndUpdate({slug},req.body,  {new: true,}).exec();
        res.json(updated);

    } catch (err) {
        console.log(err)
        res.status(400).send(err.message)
    }
}
export const removeLesson = async (req,res) => {
    try {
        const {slug, lessonId}= req.params
        const course = await Course.findOne({slug}).exec();
        if (req.auth._id != course.instructor) {
            return res.status(400).send("Unauthorized")
        }
        const deletedCourse = await Course.findByIdAndUpdate(course._id, {
            $pull: {lessons: {_id:lessonId}}
        }).exec();
    res.json({ok : true})

    } catch (err) {
        console.log(err)
    }
}
export const updateLesson = async(req,res) => {
    /* console.log("Updated Lesson",req.body)
    return; */

    try { 

        const {slug} = req.params;
        const {_id,title,content,video,free_preview} =req.body;
        const course = await Course.findOne({slug}).select('instructor').exec(); 
        if (req.auth._id != course.instructor){
            return res.status(400).send("Unauthorized")
        }
        const updated = await Course.updateOne({"lessons._id":_id}, {
            $set: {
                "lessons.$.title": title,
                "lessons.$.content": content,
                "lessons.$.video": video,
                "lessons.$.free_preview": free_preview,
            }
        },
        {new: true}).exec();
        console.log("testing the result of updatequery",updated)
        res.json({ok : true});

    } catch (err) {
        console.log(err)
    }
}
export const publish =async (req,res) => {
    try {
        const {courseId}=req.params;
        const course= await Course.findById(courseId).select("instructor").exec();

        if (course.instructor._id != req.auth._id){
            return res.status(400).send("Unauthorized")
        }
        const updated = await Course.findByIdAndUpdate(courseId,{published : true}, {new : true })
        res.json(updated)
    } catch (err) {
        console.log(err)
        return res.status(400).send("pulish course failed ")
    }
}
export const unpublish =async (req,res) => {
    try {
        const {courseId}=req.params;
        const course= await Course.findById(courseId).select("instructor").exec();

        if (course.instructor._id != req.auth._id){
            return res.status(400).send("Unauthorized")
        }
        const updated = await Course.findByIdAndUpdate(courseId,{published : false}, {new : true }).exec();
        res.json(updated)
    } catch (err) {
        console.log(err)
        return res.status(400).send("unpulish course failed ")
    }
}
export const courses= async(req,res) => {
    const all = await Course.find({published : true }).populate('instructor', '_id name').exec();
    /* console.log(all) */
    res.json(all)
}
export const checkEnrollment= async(req,res)=> {
    const {courseId} = req.params
    //find courses of the currently logged in user
    const user = await User.findById(req.auth._id).exec()
    //check if course id is found in user courses array 
    let ids = []
    let length = user.courses && user.courses.length;
    for (let i =0; i<user.courses.length; i++){
        ids.push(user.courses[i].toString())
    }
    res.json({
        status: ids.includes(courseId),
        course: await Course.findById(courseId).exec(),
    })

}
export const freeEnrollment = async (req, res) => {
    try {
      console.log(req.auth._id);
      const { courseId } = req.params;
  
      // Use await to ensure the result is available before proceeding
      const course = await Course.findById(courseId).exec();
  
      if (!course || course.paid) {
        return res.status(400).json({
          error: "Course not found or it's a paid course",
        });
      }
  
      // Use await to ensure the result is available before proceeding
      const result = await User.findByIdAndUpdate(
        req.auth._id,
        {
          $addToSet: { courses: course._id },
        },
        { new: true }
      ).exec();
  
      res.json({
        message: "Congratulations! You have successfully enrolled",
        course,
      });
  
      console.log("this is the result", result);
    } catch (err) {
      console.log('free enrollment err', err);
      return res.status(400).send("Enrollment create failed");
    }
  };
  export const paidEnrollment = async (req, res)=>{
    try{
         // check if course is free or paid
         const course = await Course.findById(req.params.courseId)
             .populate("instructor")
             .exec();
         if(!course.paid) return;
         //application fee 30%
         const fee =(course.price*0);
         //create stripe session
         const session = await stripe.checkout.sessions.create({
             payment_method_types: ['card'],
             mode: 'payment',
             //purchase details
             line_items:[
                 {
                     price_data: {
                         currency: 'eur',
                         product_data: {
                             name: course.name,
                         },
                         unit_amount: Math.round(course.price*100),
                     },
                     quantity: 1,
                 },
             ],
             //charge buyer and tranfer remaining balance to seller (after fee)
             payment_intent_data: {
                 application_fee_amount: Math.round(fee.toFixed(2) *100),
                 transfer_data:{
                     destination: course.instructor.stripe_account_id,
                 },
             },
             //redirect url after successful payment
             success_url: `${process.env.STRIPE_SUCCESS_URL}/${course._id}`,
             cancel_url: `${process.env.STRIPE_CANCEL_URL}`,
         });
         /* console.log("Session id =>" , session); */
 
         await User.findByIdAndUpdate(req.auth._id, {stripeSession: session}).exec();
         res.send(session.id);
    }catch(err){
        console.log("PAID ENROLLMENT ERR",err);
        return res.status(400).send("Enrollment create failed");
    }
 };
 export const stripeSuccess= async (req,res) =>{
    try {
        // find course
        const course = await Course.findById(req.params.courseId).exec();
        // get user from db to get stripe session id
        const user = await User.findById(req.auth._id).exec();
        // if no stripe session return
        if (!user.stripeSession.id) return res.sendStatus(400);
        // retrieve stripe session
        const session = await stripe.checkout.sessions.retrieve(
          user.stripeSession.id
        );
        console.log("STRIPE SUCCESS", session);
        // if session payment status is paid, push course to user's course []
        if (session.payment_status === "paid") {
          await User.findByIdAndUpdate(user._id, {
            $addToSet: { courses: course._id },
            $set: { stripeSession: {} },
          }).exec();
        }
        res.json({ success: true, course });
      } catch (err) {
        console.log("STRIPE SUCCESS ERR", err);
        res.json({ success: false });
      }
 }
 export const userCourses = async(req,res) => {
    const user = await User.findById(req.auth._id).exec();
    const courses = await Course.find({_id : { $in : user.courses } }).populate("instructor", "id name").exec();
    res.json(courses)
 }
 export const markCompleted = async (req,res) => {
    try {
        const {courseId, lessonId} = req.body
        /* console.log(courseId, lessonId) */
        // First step we will check if user with that course is already created
        const existing = await Completed.findOne({
            user: req.auth._id,
            course: courseId,
        }).exec();
        if (existing) {
            //update
            const updated = await Completed.findOneAndUpdate({
                user : req.auth._id,
                course : courseId ,
            },{
                $addToSet : {lessons : lessonId}
            }).exec()
            res.json({ok :true });
        } else {
            //create 
            const created = await new Completed({
                user :req.auth._id,
                course : courseId,
                lessons : lessonId
            }).save();
            res.json({ok : true});

        }
    } catch (error) {
        console.log(error)
    }
 }
 export const listCompleted = async(req,res)=>{
    try {
        const userId= req.auth._id;
        const {courseId}= req.body;
         const list = await Completed.findOne({
            user : userId,
            course: courseId
         }).exec()
         list && res.json(list.lessons)
    } catch (err) {
        console.log(err)
    }
 }
 export const markIncompleted = async(req,res)=> {
    try {
        const {courseId, lessonId} = req.body
        const updated = await Completed.findOneAndUpdate({
            user : req.auth._id,
            course : courseId ,
        },{
            $pull : {lessons : lessonId}
        }).exec()
        res.json({ok :true })
    } catch (err) {
        console.log(err)
    }
 }
 export const countStudents = async (req,res) => {
    try {
        const {courseId} = req.body;
        const users = await User.find({
            courses : courseId,
        }).select('_id').exec();
        res.json(users)
    } catch (err) {
     console.log(err)   
    }
 }
  