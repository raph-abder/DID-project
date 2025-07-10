const MyAccount = artifacts.require("MyAccount");

module.exports = function (deployer) {
  deployer.deploy(MyAccount);
};
