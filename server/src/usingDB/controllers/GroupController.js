/* eslint-disable camelcase */
/* eslint-disable max-len */
/* eslint-disable no-shadow */
/* eslint-disable brace-style */
/* eslint-disable class-methods-use-this */
/* eslint-disable consistent-return */
/* eslint-disable no-unused-vars */
/* eslint-disable no-unsafe-finally */
/* eslint-disable no-useless-escape */
/* eslint-disable prefer-destructuring */
import jwt from 'jsonwebtoken';
import db from '../db';

class GroupController {
  static async createGroup(req, res) {
    let group = [];
    const checkGroup = 'SELECT * FROM groups WHERE group_email=$1';
    const { groupEmail } = req.body;
    if (!req.body.groupName || !req.body.groupEmail) {
      return res.status(400).send({ message: 'please enter groupName or groupEmail' });
    }
    // validate to ensure its a valid mail and its an epic mail
    const validateEmail = /^([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z]{2,5})$/;
    const result = validateEmail.test(groupEmail);
    const newVal = groupEmail.split('@');
    const finalCheck = newVal[1];
    if (!result || finalCheck !== 'epic.com') {
      return res.status(400).send({ message: 'please enter a valid epic email' });
    }
    if (req.body.groupName || req.body.groupEmail) {
      const { rows } = await db.query(checkGroup, [req.body.groupEmail]);
      group = rows[0];
      if (group) {
        return res.status(400).send({ message: 'Group email already exists' });
      }
    }
    const text = 'INSERT INTO groups(group_name,group_email,created_by)VALUES($1,$2,$3)';
    const values = [
      req.body.groupName,
      req.body.groupEmail,
      req.decodedMessage.id,
    ];
    const { rows } = await db.query(text, values);
    return res.status(201).send({
      status: 'success',
      message: 'Email group created successfully',
    });
  }

  static async createUserGroup(req, res) {
    const validNumber = req.params.id;
    const paramValue = /^\+?(0|[1-9]\d*)$/;
    const result = paramValue.test(validNumber);
    if (!result) {
      return res.status(400).send('you have not inputed a valid ID');
    }
    let group = [];
    const userGroup = [];
    const checkGroup = 'SELECT * FROM groups WHERE id=$1 AND created_by=$2';
    const { groupEmail } = req.body;
    if (!req.body.userEmails) {
      return res.status(400).send({ message: 'user emails are required' });
    }
    if (req.body.userEmails) {
      const { rows } = await db.query(checkGroup, [req.params.id, req.decodedMessage.id]);
      group = rows[0];
      if (!group) {
        return res.status(400).send({ message: 'There is an error, it is either group does not exist or you are not allowed to add users to this group' });
      }
    }
    let result1 = [];
    const { rows } = await db.query(checkGroup, [req.params.id, req.decodedMessage.id]);
    result1 = rows[0];
    const aa = req.body.userEmails;
    const text = `INSERT INTO user_groupings (group_id, user_ids) VALUES (${group.id}, unnest(array[${aa}]))`;
    try {
      const { rows } = await db.query(text);
      return res.status(201).send(rows[0]);
    } catch (error) {
      return res.status(500).send(error);
    }
  }

  static async deleteAGroup(req, res) {
    const validNumber = req.params.id;
    const paramValue = /^\+?(0|[1-9]\d*)$/;
    const result = paramValue.test(validNumber);
    if (!result) {
      return res.status(400).send('you have not inputed a valid ID');
    }
    let groupOutput = [];
    let deleteUserGroupOutput = [];
    let deleteGroupOutput = [];
    const getGroup = 'SELECT * FROM groups WHERE id=$1 AND created_by=$2';
    const deleteUserGroup = 'DELETE FROM user_groupings WHERE group_id=$1 returning *';
    const deleteGroup = 'DELETE FROM groups WHERE id=$1 AND created_by=$2 returning *';

    try {
      const { rows } = await db.query(getGroup, [req.params.id, req.decodedMessage.id]);
      groupOutput = rows[0];
      if (!groupOutput) {
        return res.status(404).send({ message: 'group does not exist' });
      }
    } catch (e) {
      return res.status(500).send({ message: 'there is an error, check your group request' });
    }

    try {
      const { rows } = await db.query(deleteUserGroup, [req.params.id]);
      deleteUserGroupOutput = { rows };
      if (!deleteUserGroupOutput) {
        return res.status(404).send({ message: 'you cannot delete this user group either because you do not own it or it doesnt exist' });
      }
    } catch (e) {
      return res.status(400).send({ message: 'there is an error, please check your request' });
    }

    try {
      const { rows } = await db.query(deleteGroup, [req.params.id, req.decodedMessage.id]);
      deleteGroupOutput = rows[0];
      if (!deleteGroupOutput) {
        return res.status(404).send({ message: 'you are not permitted to delete this group' });
      }
      return res.status(200).send({ message: 'the group has been deleted' });
    } catch (e) {
      return res.status(500).send({ message: 'there is an error, please check your request' });
    }
  }

  static async deleteUserInGroup(req, res) {
    const validNumber1 = req.params.group;
    const validNumber2 = req.params.user;
    const paramValue = /^\+?(0|[1-9]\d*)$/;
    const result = paramValue.test(validNumber1);
    const result1 = paramValue.test(validNumber2);
    if (!result || !result1) {
      return res.status(400).send('you have not inputed a valid ID');
    }
    let user = []; let deleteUserOutput = [];
    const userQuery = `SELECT * FROM user_groupings u 
                             INNER JOIN groups g ON u.group_id = g.id
                             WHERE g.created_by=$1 AND u.group_id=$2 AND u.user_ids=$3`;
    const deleteUser = 'DELETE FROM user_groupings WHERE group_id=$1 AND user_ids=$2';
    const { rows } = await db.query(userQuery, [req.decodedMessage.id, req.params.group, req.params.user]);
    user = rows[0];
    if (!user) {
      res.status(404).send({ message: 'user does not exist' });
    }
    try {
      const { rows } = await db.query(deleteUser, [user.group_id, user.user_ids]);
      deleteUserOutput = rows[0];
      return res.status(200).send({ message: 'user has been deleted successfully' });
    } catch (e) {
      return res.status(500).send(e);
    }
  }

  static async sendGroupMessage(req, res) {
    const validNumber = req.params.id;
    const paramValue = /^\+?(0|[1-9]\d*)$/;
    const result = paramValue.test(validNumber);
    if (!result) {
      return res.status(400).send('you have not inputed a valid ID');
    }
    // const { email } = req.body;
    // let data = [];
    // u need to do this cos row[0] cant be used outside await db.query
    let userData = [];
    const findOneGroupEmail = `SELECT * FROM groups  
                                  WHERE id=$1`;
    if (!req.body.subject) {
      return res.status(400).send({ message: 'A subject is required' });
    }
    if (!req.body.message) {
      return res.status(400).send({ message: 'A message is required' });
    }
    if (req.body.subject || req.body.message) {
      try {
        const { rows } = await db.query(findOneGroupEmail, [req.params.id]);
        userData = rows[0];
        if (!userData) {
          return res.status(404).send({ message: 'the group does not exist' });
        }
        // insert new message into db
        const text = `
            INSERT INTO messages(created_on,email,subject,message,status,sender,reciever,group_reciever,is_deleted,group_status)
            VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
            returning *`;
        const values = [
          new Date(),
          userData.group_email,
          req.body.subject,
          req.body.message,
          'unread',
          req.decodedMessage.id,
          null,
          userData.id,
          'false',
          'true',
        ];
        const { rows: output } = await db.query(text, values);
        // eslint-disable-next-line object-curly-newline
        return res.status(201).send({
          status: 200,
          data: output,
        });
      } catch (error) {
        return res.status(500).send('something is wrong with your request');
      }
    }
  }

  static async getAllGroups(req, res) {
    const group = 'SELECT * FROM groups where created_by=$1';
    let output = [];
    try {
      const { rows } = await db.query(group, [req.decodedMessage.id]);
      output = rows;
      if (!output) {
        res.status(404).send({ message: 'you have not created any groups' });
      }
      res.status(200).send({
        status: 200,
        data: output,
      });
    }
    catch (e) {
      return res.status(400).send(e);
    }
  }
}

export default GroupController;