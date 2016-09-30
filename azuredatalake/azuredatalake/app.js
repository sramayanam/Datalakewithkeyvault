//key vault library
var KeyVault = require('azure-keyvault');

//util
var util = require('util');

//Windows Azure active directory context -- ADL Integrates with windows Azure active directory
var AuthenticationContext = require('adal-node').AuthenticationContext;

//enable application to access Key Vault - Create an AAD application for the key vault

var config = require('./config.json');
console.log("Printing First Value from Config :::: " + config.kvClientID);

var clientId = config.kvClientID; 

//Create a key and set expiration date for the key to access application on Azure AD
var clientSecret = config.kvClientSecret; 

//Provide URI for the key Vault
var vaultUri = "https://srramkeyvault.vault.azure.net";

// Authenticator - Mechanism to retrieve the access token for the subscription
var authenticator = function (challenge, callback) {

    // Create a new authentication context.
    var context = new AuthenticationContext(challenge.authorization);

    // Use the context to acquire an authentication token.
    return context.acquireTokenWithClientCredentials(challenge.resource, clientId, clientSecret, function (err, tokenResponse) {
        if (err) throw err;
        // Calculate the value to be set in the request's Authorization header and resume the call.
        var authorizationValue = tokenResponse.tokenType + ' ' + tokenResponse.accessToken;

        return callback(null, authorizationValue);
    });

};

//instantiate credentials
var credentials = new KeyVault.KeyVaultCredentials(authenticator);

//Get the handle to the key vault 
var client = new KeyVault.KeyVaultClient(credentials);

//Create the URL for the GET call from the restAPI
var secretName = config.VaultKeyName;
var secretVersion = config.VaultKeyVersion; // Pass the custom version of the key vault key as desired
var secretID = vaultUri + "\/" + "secrets" + "\/" + secretName + "\/" + secretVersion;

console.log("Printing the secret ID" + secretID);

// Retrieve the ADL key from the Key Vault - Keys can be rotated for vault but ADL key is intact

client.getSecret(secretID, function (getErr, getSecretBundle) {

        if (getErr) throw getErr;

        console.log('\n\nSecret ', getSecretBundle.value, ' is retrieved.\n');

        //Code for managing ADL starts
        var msrestAzure = require('ms-rest-azure');
        var adlsManagement = require("azure-arm-datalake-store");

        //service principal authentication using the key retrieved fromkey vault using 
        //first parameter application id, second parameter tenant, third parameter getSecretBundle.value from above
        var credentials = new msrestAzure.ApplicationTokenCredentials(config.DLClientID, config.TenantID, getSecretBundle.value );
        console.log("Printing Credential", credentials);
        //Get handle to ADL file system
        var filesystemClient = new adlsManagement.DataLakeStoreFileSystemClient(credentials);

        //ADL account name 
        var accountName = 'srramtest';
        //enumerate everything under the root & Print files and folders
        var pathToEnumerate = '/';
        filesystemClient.fileSystem.listFileStatus(accountName, pathToEnumerate, function (err, result, request, response) {
            if (err) {
                console.log(err);
            } else {
                console.log('result is: ' + util.inspect(result, { depth: null }));
            }
        });

});
