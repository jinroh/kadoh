module.exports = function(db, DataTypes) {

  var Result = db.define("Result", {
    id         : {type : DataTypes.INTEGER, autoIncrement: true},
    type       :         DataTypes.STRING,
    
    time       :         DataTypes.INTEGER,
    reached    :         DataTypes.INTEGER,
    queries    :         DataTypes.INTEGER,
    closest    :         DataTypes.INTEGER,
    
    dht_size   :         DataTypes.INTEGER,
    user_agent :         DataTypes.STRING,
    mobile     :         DataTypes.BOOLEAN,
    cellular   :         DataTypes.BOOLEAN
    
    //created_at :         DataTypes.DATE  --> automatically< written by Sequelize
  });

  Result.sync().error(function() {
    console.log(arguments);
  });
  return Result;
};