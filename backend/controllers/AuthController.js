import User from '../models/userModel.js';
import bcrypt from 'bcrypt';
import  jwt from 'jsonwebtoken';


export const signup = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existingUser = await User.getUserByEmail(email);
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = await User.createUser(name, email, hashedPassword);

    res.status(201).json({ message: 'User registered', userId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {

    const user = await User.getUserByEmail(email);
    if (!user) return res.status(400).json({ message: 'User not found' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Incorrect password' });

    // Optional: Generate a JWT
    const token = jwt.sign({ id: user.id , user_type: user.user_type}, 'secret_key', { expiresIn: '1h' });

    //if(process.env.NODE_ENV == 'production'){
  res.cookie('token', token, {
    httpOnly: true,
    secure: true, // set to true in production (requires HTTPS)
    sameSite: 'None',
    maxAge: 3600000
  });
  
  //   }else{
  //   res.cookie('token', token, {
  //   httpOnly: false,
  //   secure: true, 
  //   sameSite: 'strict',
  //   maxAge: 3600000
  // });
  //   }
  
    return res.json({ message: 'Login successful' , user_type: user.user_type});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

