const express= require("express");
const router= express.Router();
const multer = require("multer")


const Post = require('../models/post');
const checkAuth = require('../middleware/check-auth');

const MIME_TYPE_MAP = {
    'image/png':'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg'
};

const storage = multer.diskStorage({
    destination: (req, file, cb)=>{
        const isValid = MIME_TYPE_MAP[file.mimetype];
        let error = new Error("Invalid Mimetype");
        if(isValid){
            error=null;
        }
        cb(error,"backend/images");
    },
    filename: (req, file, cb) => {
        const name = file.originalname.toLowerCase().split(' ').join('-');
        const ext = MIME_TYPE_MAP[file.mimetype];
        cb(null,name+'-'+Date.now()+'.'+ext);
    }
})



router.post("/api/post",checkAuth, multer({storage: storage}).single("image"),(req,res,next)=>{
    const url = req.protocol + '://'+req.get("host");
    const post = new Post({
        title: req.body.title,
        content: req.body.content,
        imagePath: url + "/images/" + req.file.filename,
        creator: req.userData.userId
    })
    post.save().then(result=>{
        res.status(201).json({
            message: "Post successfully added!",
            post:{
                id: result._id,
                title: result.title,
                content: result.content,
                imagePath: result.imagePath,
                creator: req.userData.userId
            }
        });
    });
   
});


router.get("/api/posts",(req,res,next)=>{
    const pageSize = +req.query.pagesize;
    const currentPage = +req.query.page;
    const postQuery = Post.find();
    let fetchedPosts;

    if (pageSize && currentPage){
        postQuery.skip(pageSize*(currentPage-1)).limit(pageSize);
    }

     postQuery.then(posts=>{
        fetchedPosts=posts
        return Post.count()
     }).then(count=>{
        res.status(200).json({
            message: 'posts fetched successfully',
            posts: fetchedPosts,
            maxPosts: count
        })
     })
    
});

router.get("/api/posts/:id", (req,res,next)=>{
    Post.findById(req.params.id).then(
        post=>{
            if(post){
                res.status(200).json(post)
            }else{
                res.status(404).json({
                    message: 'No post found!'
                })
            }
        }
    )
})

router.put("/api/posts/:postId",checkAuth, multer({storage: storage}).single("image"), (req, res, next)=>{
    let imagePath=req.body.imagePath;
    if(req.file){
        
        const url = req.protocol + '://'+req.get("host");
        imagePath= url + "/images/" + req.file.filename
    }
    const newPost= new Post({
        _id: req.body.id,
        title: req.body.title,
        content: req.body.content,
        imagePath: imagePath,
        creator: req.userData.userId
    });
    
    
    Post.updateOne({_id:req.params.postId, creator: req.userData.userId},newPost).then(
        (result)=>{
            if(result.nModified>0){
                res.status(200).json({message: 'Post updated successfully!'});
            }
            else{
                res.status(401).json({message: 'Not Authorized!'});
            }

        }
    )
})

router.delete("/api/post/:id",checkAuth, (req, res, next)=>{
    Post.deleteOne({_id: req.params.id,creator: req.userData.userId})
        .then((result)=>{

            if(result.n>0){
                res.status(200).json({message: 'Post deleted successfully!'});
            }
            else{
                res.status(401).json({message: 'Not Authorized!'});
            }
        })
   
});



module.exports=router;