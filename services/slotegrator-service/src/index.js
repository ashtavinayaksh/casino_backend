require('dotenv').config();
const express=require('express');
const bodyParser=require('body-parser');
const connectDB=require('../../shared/db/connection');
const { init:initRedis }=require('../../shared/redis/redisClient');
const routes=require('./routes/slotegrator.routes');
const app=express();
app.use(bodyParser.json());
(async()=>{
  await connectDB(process.env.MONGO_URI);
  await initRedis(process.env.REDIS_URL||'redis://localhost:6379');
  app.use('/api/slotgrator',routes);
  app.get('/healthz',(req,res)=>res.json({ok:true}));
  app.listen(process.env.PORT||4002,()=>console.log('Slotegrator service running',process.env.PORT||4002));
})();
