const { User } = require("../models/user");
const Session = require("../models/session");
const {
  ValidationMsgs,
  TableNames,
  TableFields,
} = require("../utils/constants");
const Util = require("../utils/utils");
const ValidationError = require("../utils/ValidationError");

const UserService = class {
  static getUserByEmail = (email) => {
    return new ProjectionBuilder(async function () {
      return await User.findOne(
        {
          [TableFields.email]: email,
        },
        this
      );
    });
  };

  static getUserById = (id) => {
    if (!id) throw new ValidationError(ValidationMsgs.idEmpty);
    return new ProjectionBuilder(async function () {
      return await User.findById(
        {
          [TableFields.ID]: id,
        },
        this
      );
    });
  };

  static getUserByIdAndToken = (id, token) => {
    if (!id) throw new ValidationError(ValidationMsgs.idEmpty);
    if (!token) throw new ValidationError(ValidationMsgs.authFail);
    return new ProjectionBuilder(async function () {
      return await User.findOne(
        {
          [TableFields.ID]: id,
          [TableFields.tokens + "." + TableFields.token]: token,
        },
        this
      );
    });
  };

  static genAuthToken = (User) => {
    if (!User) throw new ValidationError(ValidationMsgs.idEmpty);
    const token = User.generateAuthToken();
    return token;
  };

  static generateOTPCode = () => {
    return Util.generateRandomPassword(4);
  };

  static saveAuthToken = async (id, token) => {
    if (!id) throw new ValidationError(ValidationMsgs.idEmpty);
    if (!token) throw new ValidationError(ValidationMsgs.authFail);
    await User.findByIdAndUpdate(
      {
        [TableFields.ID]: id,
      },
      {
        $push: {
          [TableFields.tokens]: { [TableFields.token]: token },
        },
      }
    );
  };

  static removeAuth = async (id, authToken) => {
    if (!id) throw new ValidationError(ValidationMsgs.idEmpty);
    if (!authToken) throw new ValidationError(ValidationMsgs.authFail);
    await User.findByIdAndUpdate(
      {
        [TableFields.ID]: id,
      },
      {
        $pull: {
          [TableFields.tokens]: { [TableFields.token]: authToken },
        },
      }
    );
  };

  static getResetPasswordToken = async (email) => {
    let user = await UserService.getUserByEmail(email)
      .withId()
      .withEmail()
      .withName()
      .withPasswordResetToken()
      .execute();
    if (!user) throw new ValidationError(ValidationMsgs.accountNotRegistered);

    let code;
    if (!user[TableFields.passwordResetToken]) {
      code = UserService.generateOTPCode();
      user[TableFields.passwordResetToken] = code;
      await user.save();
    } else code = user[TableFields.passwordResetToken];
    // console.log(user);
    return {
      code,
      email: user[TableFields.email],
      name: user[TableFields._name],
    };
  };

  static resetPassword = async (email, code, newPassword) => {
    let user = await UserService.getUserByEmail(email)
      .withId()
      .withEmail()
      .withName()
      .withMobile()
      .withTokens()
      .withPasswordResetToken()
      .execute();
    if (!user) throw new ValidationError(ValidationMsgs.accountNotRegistered);

    if (user[TableFields.passwordResetToken] == code) {
      user[TableFields.password] = newPassword;
      user[TableFields.passwordResetToken] = "";
      user[TableFields.tokens] = [];
      return await user.save();
    } else throw new ValidationError(ValidationMsgs.InvalidPassResetCode);
  };

  static insertUserRecord = async (reqBody) => {
    let email = reqBody[TableFields.email];
    let name = reqBody[TableFields._name];
    let password = reqBody[TableFields.password];

    let user = new User();
    user[TableFields._name] = name;
    user[TableFields.email] = email;
    user[TableFields.password] = password;
    try {
      return await user.save();
    } catch (err) {
      console.log(`Error from (insertUserRecord) Userservice: ${err}`);
      throw err;
    }
  };

  static insertCartData = async (sessionId, cart, total, user) => {
    let userCart = new Session();
    userCart.sessionId = sessionId;
    userCart.cart = cart;
    userCart.total = total;
    userCart.user = user;

    try {
      return await userCart.save();
    } catch (err) {
      console.log(`Error from (insertCartData) Userservice: ${err}`);
      throw err;
    }
  };

  static deleteMyReferences = async (
    cascadeDeleteMethodReference,
    tableName,
    ...referenceId
  ) => {
    let records = undefined;
    switch (tableName) {
      case TableNames.User:
        records = await User.find(
          {
            [TableFields.ID]: { $in: referenceId },
          },
          { [TableFields.ID]: 1 }
        );
        break;
    }

    if (records && records.length > 0) {
      let deleteRecordIds = records.map((a) => a[TableFields.ID]);
      await User.updateMany(
        { [TableFields.ID]: { $in: deleteRecordIds } },
        { [TableFields.deletedAt]: new Date(), [TableFields.isDeleted]: 1 }
      );
      if (tableName != TableNames.User) {
        //It means that the above objects are deleted on request from model's references (And not from model itself)
        cascadeDeleteMethodReference.call(
          {
            ignoreSelfCall: true,
          },
          TableNames.User,
          ...deleteRecordIds
        ); //So, let's remove references which points to this model
      }
    }
  };
};

const ProjectionBuilder = class {
  constructor(methodToExecute) {
    const projection = {
      populate: {},
    };
    this.withId = () => {
      projection[TableFields.ID] = 1;
      return this;
    };
    this.withEmail = () => {
      projection[TableFields.email] = 1;
      return this;
    };
    this.withPassword = () => {
      projection[TableFields.password] = 1;
      return this;
    };
    this.withMobile = () => {
      projection[TableFields.mobile] = 1;
      return this;
    };
    this.withName = () => {
      projection[TableFields._name] = 1;
      return this;
    };
    this.withPasswordResetToken = () => {
      projection[TableFields.passwordResetToken] = 1;
      return this;
    };
    this.withTokens = () => {
      projection[TableFields.tokens] = 1;
      return this;
    };
    this.execute = async () => {
      if (Object.keys(projection.populate) == 0) {
        delete projection.populate;
      } else {
        projection.populate = Object.values(projection.populate);
      }
      return await methodToExecute.call(projection);
    };
  }
};

module.exports = UserService;
