import  User from "../models/auth"
import queryString from "query-string";
import Course from "../models/course"
const stripe = require("stripe")(process.env.STRIPE_SECRET)
export const makeInstructor = async(req,res) => {
try {
        //1. find user from db
        const user = await User.findById(req.auth._id).exec();
        //2. if user don't have stripe a stripe account id yet , then we create a new one 
        if (!user.stripe_account_id){
            const account = await stripe.accounts.create({type: "standard"})
            //console.log("ACCOUNT=>" ,account.id)
            user.stripe_account_id = account.id;
            user.save();
        }
        //3. create account link based on account id (for frontend to complete on boarding)
        let accountLink = await stripe.accountLinks.create({
            account: user.stripe_account_id,
            refresh_url: process.env.STRIPE_REDIRECT_URL,
            return_url: process.env.STRIPE_REDIRECT_URL,
            type: "account_onboarding",
        })
        //4. pre-fill any info such as email [optional],then we will send url response to front-end
        accountLink = Object.assign(accountLink,{
            "stripe_account[email]": user.email,})
        //5. send accountLink as response to the front-end
        res.send(`${accountLink.url}?${queryString.stringify({accountLink})}`)
} catch (err) {
    console.log("MAKE INSTRUCTOR ERROR",err)
}
}

export const getAccountStatus = async (req,res) => {
    try {
        const user= await User.findById(req.auth._id).exec();
        //console.log('user data ',user)
        const account = await stripe.accounts.retrieve(user.stripe_account_id)
        //console.log("ACCOUNT =>", account);
        if(account.charges_enabled) {
            return res.status(400).send("Unauthorized");
        } else {
            const statusUpdated = await User.findByIdAndUpdate(user._id, {
                stripe_seller: account,
                $addToSet: { role: "Instructor"},
            },
            {new: true }).select("-password").exec();
            res.json(statusUpdated)
        }
    } catch (err) {
        console.log(err)
    }
}
export const currentInstructor = async (req, res) => {
    try {
      const user = await User.findById(req.auth._id).select("-password").exec();
      if (!user.role.includes("Instructor")) {
         return res.sendStatus(403);
      } else {
        res.json({ok: true})
      }
    } catch (err) {
      console.log(err);
    }
  };
export const instructorCourses = async(req,res) => {
/*     console.log(req.auth._id)
    return; */
    try {
        const courses = await Course.find({instructor: req.auth._id}).sort({createdAt: -1}).exec()
        res.json(courses)  
    } catch (err) {
        console.log(err)
    }
}
export const instructorBalance =async (req,res)=>{
    try {
        let user = await User.findById(req.auth._id).exec()
        const balance = await stripe.balance.retrieve({
            stripeAccount: user.stripe_account_id, 
        })
        console.log(balance)
        res.json(balance);
    } catch (err) {
       console.log(err) 
    }
}
export const payoutSettings =async (req,res)=> {
    try {
        let user = await User.findById(req.auth._id).exec()
        const loginLink = await stripe.accounts.createLoginLink(user.stripe_seller.id,
             {redirect_url: process.env.STRIPE_SETTINGS_REDIRECT});
             res.json(loginLink.url)

    } catch (err) {
console.log(err)
    }
}
