import db from '../db';
import UserModel from '../../models/model';
import jwt from 'jsonwebtoken';

const epicApp = {
    async createUser(req,res){
      // use $1 to refer to the first record in ur search
      const findOneEmail = 'SELECT * FROM users WHERE email=$1';
      const email = req.body.email;
      if(!email){
        return res.status(400).send({ message: 'email is required' });
      }
      if(email){
        try {
          const { rows } = await db.query(findOneEmail, [req.body.email]);
          if(rows[0]) {
            return res.status(400).send({'message': 'email already exists'});
          }
        }
        finally{
          const validateEmail = /^([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z]{2,5})$/;
        const result = validateEmail.test(email);
        const newVal = email.split('@');
        const finalCheck = newVal[1];
        if(!result || finalCheck !=="epic.com"){ 
          return res.status(400).send({ message: 'please enter a valid epic email' });
        }
        }
      }
      if(!req.body.firstName || req.body.firstName.length < 3){
        return res.status(400).send({ message: 'first name is required and has a minimum of 3 characters' });
      }
      if(!req.body.lastName || req.body.lastName.length < 3){
        return res.status(400).send({ message: 'last name is required and has a minimum of 3 characters' });
      }
      if(!req.body.password || req.body.password.length < 6){
        return res.status(400).send({ message: 'password is required and has a minimum of 6 characters' });
      }
      const hashedPassword = UserModel.hashPassword(req.body.password);
      // call req.body, destructure to get password and then save encrypt into password
      const userData = {...req.body, password: hashedPassword};
      let token = jwt.sign({ email: findOneEmail.email, id: findOneEmail.id },
        process.env.SECRET,
        { expiresIn: '24h' });
      res.status(200).send({
        status: 'success',
        data:
       {
         message: `Authentication successful!. Welcome ${req.body.firstName}`,
         token: token
       },
      });
        const text = `
        INSERT INTO users(email,first_name,last_name,password)
        VALUES($1,$2,$3,$4)
        returning *`;
        const values = [
            req.body.email,
            req.body.firstName,
            req.body.lastName,
            userData.password
        ];
        try {
            const { rows } = await db.query(text, values);
            return res.status(201).send(rows[0]);
          } catch(error) {
            return res.status(400).send(error);
          }
    }
}
export default epicApp;