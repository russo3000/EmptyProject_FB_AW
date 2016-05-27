angular.module('services', [])

.service('UserService', function() 
{
  //for now I will store user data on ionic local storage but Later I should save it on a database
  var setUser = function(user_data) 
  {
    window.localStorage.GoByData = JSON.stringify(user_data);
  };

  var getUser = function()
  {
    return JSON.parse(window.localStorage.GoByData || '{}');
  };

  return {
    getUser: getUser,
    setUser: setUser
  };
})
.factory('ConnectivityMonitor', function($cordovaNetwork, $rootScope)
{  
  function checkConnection()
  {    
    if($rootScope.isMobile())
    {
      if($cordovaNetwork.isOnline())
      {
        return true;  
      }
      else
      {
        return false;
      }
    }
    else
    {  
      if(navigator && navigator.onLine)
      {
        return true;  
      }
      else
      {
        return false;
      }
    }
  };

  function startWatching(callback)
  {
    //console.log("in start watching: " + $rootScope.connectionStatus);

      if($rootScope.isMobile())
      {
        $rootScope.$on('$cordovaNetwork:online', function(event, networkState)
        {            
         // console.log("went online");
          $rootScope.connectionStatus = "connected";
          callback($rootScope.connectionStatus);
        });

        $rootScope.$on('$cordovaNetwork:offline', function(event, networkState)
        {
         // console.log("went offline");
          $rootScope.connectionStatus = "not-connected";
          callback($rootScope.connectionStatus);
        });
      }
      else 
      {
        window.addEventListener("online", function(e) 
        {
        //  console.log("went online");
          $rootScope.connectionStatus = "connected";
          callback($rootScope.connectionStatus);
        }, false);    

        window.addEventListener("offline", function(e) 
        {
        //  console.log("went offline");
          $rootScope.connectionStatus = "not-connected";
          callback($rootScope.connectionStatus);;
        }, false);  
      }
  }

  return {
    startWatching: startWatching,
    checkConnection: checkConnection
  }
}) 
.factory('DbService', function(config, UserService, ConnectivityMonitor, $rootScope) 
{
  
  function Store (userObject, callback)
  {
    userObject.time_stamp = Date.now().toString();

    //console.log("Storing:");
    //console.log(userObject);
    //console.log("-----");
    //localStorage.setItem('GoByData', JSON.stringify(userObject));

    UserService.setUser(userObject);

    if(ConnectivityMonitor.checkConnection() && $rootScope.connectionStatus != "not-connected")
    {
      //Initialize the Amazon Cognito credentials provider
      
      AWS.config.region = 'eu-west-1'; // Region
      AWS.config.credentials = new AWS.CognitoIdentityCredentials(
      {
        IdentityPoolId: config.AWSIdentityPoolId,
        Logins: {'graph.facebook.com': AWS.config.accessToken}
      });

     //console.log("AWS.config.accessToken: " +AWS.config.accessToken);

      AWS.config.credentials.get(function(err) 
      {

        //console.log("AWS.config.credentials");
        //console.log(AWS.config.credentials);

        if (err) 
        {
          alert("Error: "+err);
          console.log("Error: "+err);
          return;
        }

        //Update the Table
        //update the table with this data
       // console.log(userObject);        

          var params = 
          {
            Key: 
            {
              FbId: {S: userObject.user_id}
            },
            AttributeUpdates: 
            {
              Name: 
              {
                Action: 'PUT',
                Value: {S: userObject.name}
              },
              Email: 
              {
                Action: 'PUT',
                Value: {S: userObject.email}
              },
              Picture: 
              {
                Action: 'PUT',
                Value: {S: userObject.picture}
              },
              Language: 
              {
                Action: 'PUT',
                Value: {S: userObject.language}
              },
              FriendsWhoAlsoUseTheAppIds: 
              {
                Action: 'PUT',
                Value: {S: userObject.friends_who_also_use_the_app_ids}
              },
              Categories: 
              {
                Action: 'PUT',
                Value: {S: JSON.stringify(userObject.categories)}
              },
              TimeStamp: 
              {
                Action: 'PUT',
                Value: {S: userObject.time_stamp}
              }
            },
            TableName: 'GoBy',
            ReturnValues: 'ALL_NEW'
          };
          //update the table
          update(callback);
          
          //Description: Calls updateItem which is part of the AWS Javascript SDK.
          //Returns: JSON object (the object is stringifyed so we can see what's going on in the javascript console)
          function update(callback)
          {
            var ddb = new AWS.DynamoDB({dynamoDbCrc32: false});

          //  console.log(params);

            ddb.updateItem(params, function(err, data) 
            {
              if (err) 
              { 
                console.log(err);
                return alert(err); 
              }
          
              //go back
              if(callback)
              {
                callback(true, userObject);
              }
              
            });

            //Garbage Collection
            ddb = null;
          }
      });
    }
    else
    {
      if(callback)
      {
        callback(false, userObject);
      }
    }
  };
 
  function GetData (profileInfo, accessToken, callback)
  {  
    var friends_who_also_use_the_app_ids ="";
    
    for(var i=0; i< profileInfo.friends.data.length; i++)
    {
      friends_who_also_use_the_app_ids += profileInfo.friends.data[i].id+',';
    }
    
    friends_who_also_use_the_app_ids = friends_who_also_use_the_app_ids.replace(/,\s*$/, "");

    $rootScope.user.user_id = profileInfo.id;
    $rootScope.user.name = profileInfo.name;
    $rootScope.user.email = profileInfo.email;    
    $rootScope.user.picture = "http://graph.facebook.com/" + profileInfo.id + "/picture?type=large";
    $rootScope.user.friends_who_also_use_the_app_ids = friends_who_also_use_the_app_ids;


    if(typeof $rootScope.user.friends == "undefined")
    {
      $rootScope.user.friends = [];  
    }
    
    UserService.setUser($rootScope.user);    

  // logged in
    //Get Long term token from short term token (2 months)
    $.get('https://graph.facebook.com/oauth/access_token', {client_id: config.FBappIdProd, client_secret: config.FBappIdSecret, grant_type: 'fb_exchange_token', fb_exchange_token: accessToken}, 
    function(returnedData)
    {      
      var longTermFBAccessToken = returnedData.split('=')[1].split('&')[0];
          
      localStorage.setItem('longTermFBAccessToken', longTermFBAccessToken);

      //Initialize the Amazon Cognito credentials provider
      AWS.config.accessToken = longTermFBAccessToken;
      AWS.config.region = 'eu-west-1'; // Region
      AWS.config.credentials = new AWS.CognitoIdentityCredentials(
      {
        IdentityPoolId: config.AWSIdentityPoolId,
        Logins: {'graph.facebook.com': AWS.config.accessToken}
      });


      //console.log("AWS.config.accessToken: " +AWS.config.accessToken);
      //alert("AWS.config.accessToken: " +AWS.config.accessToken);

      AWS.config.credentials.get(function(err) 
      {
        //console.log("AWS.config.credentials");
        //console.log(AWS.config.credentials);
        
        if(err) 
        { 
          alert("Error: "+err);  
          console.log("Error: "+err);
                                  
          callback(false);
        }

        //alert('getting data 2');
        var userObject = UserService.getUser();
        
        //Get Item from the Table
        //attribute to read
        var readparams = 
        {
          Key: { FbId: {S: userObject.user_id} },            
          AttributesToGet: ['FbId','Name','Email','Picture','Language','FriendsWhoAlsoUseTheAppIds','Categories','TimeStamp'],
          TableName: 'GoBy'
        };
        
        //get the item
        read();
        
        //Description: Calls getItem which is part of the AWS Javascript SDK.
        //Returns: JSON object (the object is stringifyed so we can see  what's going on in the javascript console)
        function read()
        {
          //var ddb = new AWS.DynamoDB();
          var ddb = new AWS.DynamoDB({dynamoDbCrc32: false});
          
          ddb.getItem(readparams, function(err, data) 
          {
            if (err) { return alert(err); }

            //console.log("Got Data from AWS");
            //alert("Got Data from AWS");

            var data_string = JSON.stringify(data);
 
            //if This user doesnt exist in the AWS DB
            if(data_string == '{}')
            {
              //console.log("User doesn't exist in db, going to create it");
              $rootScope.user.categories = [];
              $rootScope.user.time_stamp = -1;
              $rootScope.user.language = $rootScope.language.split('-')[0];

              Store($rootScope.user, callback);
            }
            else
            {
              //console.log("User exists in db, we can use it");

              var AWSUserObj = JSON.parse(data_string);
              
              //console.log(AWSUserObj);

              myUser = {                  
                  user_id: AWSUserObj.Item.FbId.S,
                  name: AWSUserObj.Item.Name.S,
                  email: AWSUserObj.Item.Email.S,
                  picture: AWSUserObj.Item.Picture.S,
                  language: AWSUserObj.Item.Language.S,
                  friends_who_also_use_the_app_ids: AWSUserObj.Item.FriendsWhoAlsoUseTheAppIds.S,
                  categories: JSON.parse(AWSUserObj.Item.Categories.S),        
                  time_stamp: AWSUserObj.Item.TimeStamp.S
                };
                                
                //console.log("AWS Finished");

                //console.log(myUser);

                callback(true, myUser);                                
            }            
          });

          //Garbage Collection
          ddb = null;
        }
      });          
    });
  };

  function ReloadData (callback)
  {      
    if(ConnectivityMonitor.checkConnection() && $rootScope.connectionStatus != "not-connected")
    {
      AWS.config.region = 'eu-west-1'; // Region
      AWS.config.credentials = new AWS.CognitoIdentityCredentials(
      {
        IdentityPoolId: config.AWSIdentityPoolId,
        Logins: {'graph.facebook.com': AWS.config.accessToken}
      });

      //console.log("AWS.config.accessToken: " +AWS.config.accessToken);

      AWS.config.credentials.get(function(err) 
      {
        //console.log("AWS.config.credentials");
        //console.log(AWS.config.credentials);

        if(err) 
        { 
          alert("Error: "+err); 
          console.log("Error: "+err);                                   
          callback(false);
        }

        var userObject = UserService.getUser();
        //Get Item from the Table
        //attribute to read
        var readparams = 
        {
          Key: { FbId: {S: userObject.user_id} },
          AttributesToGet: ['FbId','Name','Email','Picture','Language','FriendsWhoAlsoUseTheAppIds','Categories','TimeStamp'],
          TableName: 'GoBy'
        };
        
        //get the item
        read();
        
        //Description: Calls getItem which is part of the AWS Javascript SDK.
        //Returns: JSON object (the object is stringifyed so we can see  what's going on in the javascript console)
        function read()
        {
          var ddb = new AWS.DynamoDB({dynamoDbCrc32: false});
          
          ddb.getItem(readparams, function(err, data) 
          {
            if (err) { return alert(err); }

            //console.log("Got Data from AWS");

            var data_string = JSON.stringify(data);
 
            //if This user doesnt exist in the AWS DB
            if(data_string == '{}')
            {
              //console.log("User doesn't exist in db, going to create it");
              $rootScope.user.categories = [];
              $rootScope.user.time_stamp = -1;

              Store($rootScope.user, callback);
            }
            else
            {
              //console.log("User exists in db, we can use it");

              var AWSUserObj = JSON.parse(data_string);
              
              //console.log(AWSUserObj);

              myUser = {                  
                  user_id: AWSUserObj.Item.FbId.S,
                  name: AWSUserObj.Item.Name.S,
                  email: AWSUserObj.Item.Email.S,
                  picture: AWSUserObj.Item.Picture.S,
                  language: AWSUserObj.Item.Language.S,
                  friends_who_also_use_the_app_ids: AWSUserObj.Item.FriendsWhoAlsoUseTheAppIds.S,
                  categories: JSON.parse(AWSUserObj.Item.Categories.S),        
                  time_stamp: AWSUserObj.Item.TimeStamp.S
                };
                                
             //   console.log("AWS Finished");
                callback(true, myUser);                                
            }            
          });

          //Garbage Collection
          ddb = null;
        }
      });
    }
    else
    {
      callback(false, UserService.getUser());
    }          
   
  };

  
  function getFriend (friendId, callback)
  {      
    if(ConnectivityMonitor.checkConnection() && $rootScope.connectionStatus != "not-connected")
    {
      AWS.config.region = 'eu-west-1'; // Region
      AWS.config.credentials = new AWS.CognitoIdentityCredentials(
      {
        IdentityPoolId: config.AWSIdentityPoolId,
        Logins: {'graph.facebook.com': AWS.config.accessToken}
      });

      //console.log("AWS.config.accessToken: " +AWS.config.accessToken);

      AWS.config.credentials.get(function(err) 
      {
        //console.log("AWS.config.credentials");
        //console.log(AWS.config.credentials);

        if(err) 
        { 
          alert("Error: "+err); 
          console.log("Error: "+err);                                   
          callback(false);
        }

        var userObject = UserService.getUser();
        //Get Item from the Table
        //attribute to read
        var readparams = 
        {
          Key: { FbId: {S: friendId} },
          AttributesToGet: ['FbId','Name','Email','Picture','Language','FriendsWhoAlsoUseTheAppIds','Categories','TimeStamp'],
          TableName: 'GoBy'
        };
        
        //get the item
        read();
        
        //Description: Calls getItem which is part of the AWS Javascript SDK.
        //Returns: JSON object (the object is stringifyed so we can see  what's going on in the javascript console)
        function read()
        {
          var ddb = new AWS.DynamoDB({dynamoDbCrc32: false});
          
          ddb.getItem(readparams, function(err, data) 
          {
            if (err) { return alert(err); }

            //console.log("Got Data from AWS");

            var data_string = JSON.stringify(data);
 
           
              //console.log("User exists in db, we can use it");

              var AWSUserObj = JSON.parse(data_string);

                if(typeof AWSUserObj.Item != "undefined")
                {

                  myUser = {                  
                      user_id: AWSUserObj.Item.FbId.S,
                      name: AWSUserObj.Item.Name.S,
                      email: AWSUserObj.Item.Email.S,
                      picture: AWSUserObj.Item.Picture.S,
                      language: AWSUserObj.Item.Language.S,
                      friends_who_also_use_the_app_ids: AWSUserObj.Item.FriendsWhoAlsoUseTheAppIds.S,
                      categories: JSON.parse(AWSUserObj.Item.Categories.S),        
                      time_stamp: AWSUserObj.Item.TimeStamp.S
                    };
                                    
                    //console.log("AWS Finished");

                    callback(true, myUser); 
                }                               
                       
          });

          //Garbage Collection
          ddb = null;
        }
      });
    }
    else
    {
      callback(false, null);
    }          
   
  };

  return {
    Store: Store,
    GetData: GetData,
    ReloadData: ReloadData,
    getFriend: getFriend
  }
})

;
