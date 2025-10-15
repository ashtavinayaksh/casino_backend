const User = require('../models/user.model');
const { generateToken } = require('../utils/jwt');
const { ethers } = require('ethers');

exports.register = async(req,res)=>{
  try{
    const { email,password,displayName } = req.body;
    const user = await User.create({ email,password,displayName });
    const token = generateToken({ sub:user._id });
    res.json({ user, token });
  }catch(e){res.status(400).json({error:e.message});}
};

exports.login = async(req,res)=>{
  try{
    const { email,password } = req.body;
    const user = await User.findOne({ email,password });
    if(!user) return res.status(401).json({error:'Invalid credentials'});
    const token = generateToken({ sub:user._id });
    res.json({ user, token });
  }catch(e){res.status(500).json({error:e.message});}
};

// SIWE simplified example (use siwe lib in production)
exports.siwe = async(req,res)=>{
  try{
    const { address,signature,message } = req.body;
    const recovered = ethers.verifyMessage(message, signature);
    if(recovered.toLowerCase()!==address.toLowerCase()) return res.status(401).json({error:'Invalid signature'});
    let user = await User.findOne({ 'walletAddresses.address': address.toLowerCase() });
    if(!user) user = await User.create({ walletAddresses:[{chain:'evm',address:address.toLowerCase()}],displayName:address });
    const token = generateToken({ sub:user._id });
    res.json({ user, token });
  }catch(e){res.status(500).json({error:e.message});}
};
