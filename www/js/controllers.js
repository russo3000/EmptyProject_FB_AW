angular.module('controllers', [])

.controller('WelcomeCtrl', function($rootScope, $scope, $state, $q, $window, $timeout, $ionicActionSheet, $cordovaToast, $ionicLoading, config, UserService, DbService, ConnectivityMonitor, $translate, $ionicPlatform) 
{
  var max = 41;
  var min = 0;
  $scope.random = Math.floor(Math.random()*(max-min+1)+min);
  $rootScope.notifications = 0;
  $rootScope.newItemFromHome = null;
  $rootScope.show_friends = false;

  $ionicPlatform.ready(function() 
  {   
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if(window.cordova && window.cordova.plugins.Keyboard) 
    {
      var setUserLanguage = function(lang) { $rootScope.language = lang.value.toLowerCase(); }
      var setUserLanguageError = function(err) { alert(err); }

      navigator.globalization.getPreferredLanguage(setUserLanguage, setUserLanguageError);          
    }
    else
    {      
      $rootScope.language = window.navigator.language.toLowerCase();            
    }  

    $translate.use($rootScope.language);  
  });

  $rootScope.isMobile = function()
  {          
    var isWebView = ionic.Platform.isWebView();    
    return isWebView;
  }

  $rootScope.showToast = function(msg)
  {
    if($rootScope.isMobile())
    {
      $cordovaToast
            .show(msg, 'short', 'center')
            .then(function(success) {
              // success
            }, function (error) {
              // error
            });
    }
    else
    {      
      $ionicLoading.show({template: msg});
      setTimeout(function() { $ionicLoading.hide();}, 2000); 
    };    
  }

  $rootScope.showConnectionStatus = function(connectionStatus)
 {  

    $(".connection-status").show();

    switch (connectionStatus)
    {
      case 'not-connected':
        $("#not-connected").show();
        $("#connected").hide();
        $("#connecting").hide();
      break;
      case 'connected':        
        $("#connected").show();
        $("#not-connected").hide();      
        $("#connecting").hide();

        setTimeout(function() 
        { 
          $(".connection-status").hide();
        }, 2000);  
      break;
      case 'connecting':
        $("#connecting").show();
        $("#not-connected").hide();
        $("#connected").hide();      
      break;
      default:
        $("#not-connected").show();
        $("#connected").hide();
        $("#connecting").hide();
      break;
    }
 }  

 $scope.show = function(userFromServer) 
 {

  //console.log($rootScope.user);

   // Show the action sheet
   var hideSheet = $ionicActionSheet.show({
     buttons: [
       { text: 'Use data from Phone  <div class="action-sheet-icons"><div class="ion-ios-cloud-upload-outline action-sheet-icon"></div> <div class="ion-ios-arrow-thin-right action-sheet-icon"></div> <div class="ion-iphone action-sheet-icon" ></div></div>' }

     ],
     titleText: '<center>Synchronization</center>Data on your phone is not the same as data on the server.',    
    destructiveText: 'Use data from Server  <div class="action-sheet-icons"><div class="ion-iphone action-sheet-icon"></div> <div class="ion-ios-arrow-thin-right action-sheet-icon"></div> <div class="ion-ios-cloud-download-outline action-sheet-icon" ></div></div>',
     
    destructiveButtonClicked: function()
    {
      //console.log("Use Server data");
      //console.log(userFromServer);

      var tmp_friends = $rootScope.user.friends;

      $rootScope.user = userFromServer;
      $rootScope.user.friends = tmp_friends;

      UserService.setUser($rootScope.user);      

      return true;
    },  
     buttonClicked: function(index) 
     {
        //console.log("Use Phone data");

        $rootScope.showToast('Updating Database');
        DbService.Store($rootScope.user, null);
      
        $scope.$apply();
       return true;
     }
   });

 };



$rootScope.GotFriend = function(connected, friend)
{
  //console.log("rootScope.GotFriend");

  if(connected)
  {
    friend.category_names = "";
    for(var i=0; i< friend.categories.length; i++)
    {                          
        friend.category_names +=friend.categories[i].name+', ';           
    }
    friend.category_names = friend.category_names.replace(/,\s*$/, "");

    var found = false;
    for(var i=0; i< $rootScope.user.friends.length; i++)
    {
      if($rootScope.user.friends[i].user_id == friend.user_id)
      {
        found = true;
        if($rootScope.user.friends[i].time_stamp != friend.time_stamp) 
        {
          friend.notified = true;            
          $rootScope.notifications++;
          $rootScope.user.friends[i] = friend;          
        }
        else
        {
          $rootScope.user.friends[i].notified = false;
          //console.log("No need to notify about: " +$rootScope.user.friends[i].name);
        }
      }
    }

    //console.log(friend);

    if(!found)
    {      
      friend.notified = true;            
      $rootScope.notifications++;
      $rootScope.user.friends.push(friend); 
    }

    UserService.setUser($rootScope.user); 

    $scope.$apply();    
    $ionicLoading.hide();
  }
  else
  {
    alert("Not connected, couldn't load friends");
  }
}

  $rootScope.gotData = function(ok,  userFromServer)
  {
    $rootScope.notifications = 0;
    $rootScope.user = UserService.getUser();

    //apply translation    
    $translate.use($rootScope.user.language);

    if(ok)
    {
      $rootScope.connectionStatus = "connected";
      $("#connecting").hide();

      //console.log($rootScope.user.time_stamp + " == " + userFromServer.time_stamp);

      if($rootScope.user.time_stamp != userFromServer.time_stamp )
      {
        $scope.show(userFromServer);
      }

      var friends_who_also_use_the_app_ids = userFromServer.friends_who_also_use_the_app_ids.split(',');
        
      for(var i=0; i< friends_who_also_use_the_app_ids.length; i++)
      {
        //console.log("Loading friend with Id: "+ friends_who_also_use_the_app_ids[i]);
        DbService.getFriend(friends_who_also_use_the_app_ids[i], $rootScope.GotFriend);
      }

    }
    else
    {
      $("#connecting").hide();
      if($rootScope.user.time_stamp != userFromServer.time_stamp )
      {
        $scope.show(userFromServer);
      } 
    }
  }

  //This is the success callback from the login method
  var fbLoginSuccess = function(response) 
  {
    if (!response.authResponse){
      fbLoginError("Cannot find the authResponse");
      return;
    }

    var authResponse = response.authResponse;

    getFacebookProfileInfo(authResponse).then(function(profileInfo) 
    {
      DbService.GetData(profileInfo, authResponse.accessToken, $rootScope.gotData);       
    }, 
    function(fail)
    {
      //fail get profile info
      console.log('profile info fail', fail);
    });
  };


  //This is the fail callback from the login method
  var fbLoginError = function(error)
  {
    alert('fbLoginError', error);
    $ionicLoading.hide();
  };

  //this method is to get the user profile info from the facebook api
  var getFacebookProfileInfo = function (authResponse) 
  {
    var info = $q.defer();

    facebookConnectPlugin.api('/me?fields=email,name,friends&access_token=' + authResponse.accessToken, null,
      function (response) 
      {      
        info.resolve(response);
      },
      function (response) 
      {
        alert("ERROR: " + response);
        info.reject(response);
      }
    );
    return info.promise;
  };

  $scope.clearLocalStorage = function()
  {
    window.localStorage.clear(); 
    console.log("cleared localstorage");
  }



  //This method is executed when the user press the "Login with facebook" button
  $scope.facebookSignIn = function() 
  {
    if(ConnectivityMonitor.checkConnection())
    {
      //console.log("Starting FB Login");
      $rootScope.showToast('Logging in...');

      //$rootScope.connectionStatus = "not-connected";
      $rootScope.showConnectionStatus($rootScope.connectionStatus);      

      if($rootScope.isMobile())
      {
        //console.log("Mobile");      
        facebookConnectPlugin.getLoginStatus(function(success)
        {
          $rootScope.connectionStatus = "connecting";
          $rootScope.showConnectionStatus($rootScope.connectionStatus);      
          //ask the permissions you need. You can learn more about FB permissions here: https://developers.facebook.com/docs/facebook-login/permissions/v2.4
          facebookConnectPlugin.login(['email', 'public_profile','user_friends'], fbLoginSuccess, fbLoginError); 
        });

        $ionicLoading.hide();
        $state.go('app.home');

        if(typeof $rootScope.showConnectionStatus != "undefined")
        {
         $rootScope.showConnectionStatus($rootScope.connectionStatus);
        }
      } 
      else 
      {        
       // console.log("Web Browser");
       // console.log($rootScope.connectionStatus);

        if(typeof FB != "undefined" && $rootScope.connectionStatus != "not-connected")
        {          
          FB.login(function(response)
          {            
            var authResponse = response.authResponse;

            if(typeof authResponse != "undefined")
            {
              FB.api('/me', {fields: 'email,name,friends'}, function(profileInfo) 
              {
                $rootScope.connectionStatus = "connecting";      
                $rootScope.showConnectionStatus($rootScope.connectionStatus);

                DbService.GetData(profileInfo, authResponse.accessToken, $rootScope.gotData);            
              });                
            }
          }, {scope: 'email,public_profile,user_friends', return_scopes: true});
        }
        
        $ionicLoading.hide();
        $state.go('app.home'); 

        if(typeof $rootScope.showConnectionStatus != "undefined")
        {
         $rootScope.showConnectionStatus($rootScope.connectionStatus);
        }      
     }
    }
    else
    {
      $rootScope.showToast('Not Connected to Server available, Loading Local Data');

      setTimeout(function()
      { 
        $rootScope.connectionStatus = "not-connected";
        $state.go('app.home');

        if(typeof $rootScope.showConnectionStatus != "undefined")
        {
         $rootScope.showConnectionStatus($rootScope.connectionStatus);
        }

      }, 2000);          
    }
  
  };


  if(config.isOnline)
  {
    $rootScope.connectionStatus = "connected";      
  }
  else
  {
    $rootScope.connectionStatus = "not-connected";
  }

  ConnectivityMonitor.startWatching($rootScope.showConnectionStatus);
  $rootScope.showConnectionStatus($rootScope.connectionStatus);  

})

//Side Menu functionality goes here
.controller('AppCtrl', function($rootScope, $scope, UserService, $state, $ionicLoading, $ionicHistory, $translate, DbService){  


  $rootScope.user = UserService.getUser();

  $scope.goHome = function()
  {
    $ionicHistory.nextViewOptions(
    {
      disableBack: true
    });
    $state.go('app.home'); 
  }

  $rootScope.isMobile = function()
  {          
    var isWebView = ionic.Platform.isWebView();
    return isWebView;
  }

  $scope.languageChanged = function()
  {    
    $rootScope.user.language = $scope.user.language;

    //console.log($rootScope.user.language);
    
    $translate.use($rootScope.user.language);
    
    $rootScope.showToast('Saving');
    DbService.Store($rootScope.user, null);
  }

  $scope.logOut = function() 
  {

    $rootScope.showToast('Logging out...');

    if(typeof AWS != "undefined")
    {
      if(AWS.config.credentials)
        AWS.config.credentials.clearCachedId();
    }

    if($rootScope.isMobile())
    {
        //facebook logout
        facebookConnectPlugin.logout(function()
        {
          $ionicLoading.hide();
          $state.go('welcome');

        },
        function(fail)
        {
          $ionicLoading.hide();
          $state.go('welcome');
        });
    }
    else
    {
      if(typeof FB != "undefined")
      {
        FB.logout(function(response){});
        $ionicLoading.hide();
        $state.go('welcome');
      }
      else
      {
        $ionicLoading.hide();
        $state.go('welcome');
      }
    }
  };

})


.controller('HomeCtrl', function($ionicPlatform, $rootScope, $scope, UserService, DbService, $state, $filter, $ionicLoading, $ionicPopup, $ionicScrollDelegate, $ionicListDelegate, $cordovaToast, $timeout, $ionicModal){

  //console.log("in Home");

	$rootScope.user = UserService.getUser();

  if(typeof $rootScope.user.categories == "undefined" || $rootScope.user.categories == "")
  {
   $rootScope.user.categories = []; 
  }

  for(var i=0; i< $rootScope.user.categories.length; i++)
  {
      $rootScope.user.categories[i].checked = false;
  }

  $rootScope.toogleSidemenu = function()
  {
     $("#btn_settings").toggleClass( "active" );      
  }

   $scope.showHomeTab = function(tabId)
  {
    //console.log(tabId);
    if(!$("#"+tabId).is(':visible'))
    {
      $("#home_main").hide();
      $("#friends").hide();      
            
      $("#btn_home_main").addClass("active");
      $("#btn_friends").addClass("active");
            
      $("#btn_"+tabId).removeClass("active");

      $("#"+tabId).show(); 
    }   
  } 

  //custom filter for empty categories because we are using a nested ng-repeat
  $scope.categoryHasVisibleItems = function(category) 
  {
    if(category.items.length > 0 )
    {
      return $filter('filter')(category.items, $scope.query).length > 0;
    }
    else
    {
      //nothing to filter
      return true;
    }
  };

  $scope.refreshComplete = function(ok,  userFromServer)
  {
    $rootScope.gotData(ok,  userFromServer);
    $scope.$broadcast('scroll.refreshComplete');
    $rootScope.showConnectionStatus($rootScope.connectionStatus);
  }

  $scope.doRefresh = function() 
  {
  $("#connecting").show();
   DbService.ReloadData($scope.refreshComplete);
  };

  $scope.notConnected = function()
  {
  $rootScope.showToast('Not connected to Server');
  }

  $scope.connected = function()
  {
  $rootScope.showToast('You are connected');
  }

  $scope.connecting = function()
  {
  $rootScope.showToast('Connection in process');
  }

  $scope.goToItem = function(itemId)
  {
    //console.log(itemId);
    window.location = "#/app/item/"+itemId;
    
  }



  $scope.removeNotifications = function(friendId)
  {
   // console.log("removeNotifications");
    
    for(var i=0; i< $rootScope.user.friends.length; i++)
    {
      if($rootScope.user.friends[i].user_id == friendId)
      {
        if($rootScope.user.friends[i].notified)
        {
          $rootScope.notifications--;
          $rootScope.user.friends[i].notified = false;  

          UserService.setUser($rootScope.user);         
        }
       
       break;
      }
    }
    //console.log($rootScope.user.friends);   
  }

  $scope.addNewItem = function(myId)
  {    
    var myCategoryId = $("#"+myId).attr("current-category-id");

    //clear the array
    $rootScope.checkedCheckboxes = [];

    if(typeof myCategoryId != "undefined")
      $rootScope.checkedCheckboxes.push(myCategoryId);

//console.log($rootScope.checkedCheckboxes);
    $state.go('app.item_new');
  }

     
})

.controller('ItemCtrl', function($rootScope, $scope, $timeout, UserService, DbService, $state, $stateParams, $ionicLoading, $ionicModal, $ionicSlideBoxDelegate, $ionicPopup, $ionicListDelegate, $ionicScrollDelegate, $cordovaCamera, $cordovaFile, ConnectivityMonitor, $cordovaSocialSharing)
{
  $scope.newItem = false;

  $scope.connectionStatus = $rootScope.connectionStatus;

  
  if(typeof $rootScope.user == "undefined")
  {
    $rootScope.user = UserService.getUser();
  }

  $scope.user = $rootScope.user;

  //Creating a new Item
  if(typeof $stateParams.itemId == "undefined" && $rootScope.newItemFromHome == null)
  {  
    var max = 41;
    var min = 0;
    $scope.random = Math.floor(Math.random()*(max-min+1)+min);  

    $scope.newItem = true;
    $scope.categories_for_flicker = "";
    $scope.newItemId = 0;


    for(var i=0; i< $rootScope.user.categories.length; i++)
    {
      for(var j=0; j< $rootScope.user.categories[i].items.length; j++)
      {
        if($rootScope.user.categories[i].items[j].id > $scope.newItemId)
        {
          $scope.newItemId = $rootScope.user.categories[i].items[j].id;
        }
      }        
    }
    $scope.newItemId = $scope.newItemId +1;

   // console.log("$scope.newItemId: "+ $scope.newItemId);
    
       var default_image = {
                              image_name: 'img/items/'+$scope.random+'.jpg',
                              image_type:  'default',  
                              image_index: 0
                            }; 
      
    $scope.Item = {
    "id" : $scope.newItemId,
    "name" : ""
    };
    
    $scope.Item.name = $("#itemDataNameHome").val();
  }
  else //Editing existing Item
  {   

    if($rootScope.newItemFromHome == null) 
    {
      for(var i=0; i< $rootScope.user.categories.length; i++)
      {
        $rootScope.user.categories[i].checked = false;
        for(var j=0; j< $rootScope.user.categories[i].items.length; j++)
        {
          if($rootScope.user.categories[i].items[j].id == $stateParams.itemId)
          {
            $scope.Item = $rootScope.user.categories[i].items[j];
            $rootScope.user.categories[i].checked = true;
          }
        }
      }
    }
    else
    {
      $scope.newItem = true;
      $scope.Item = $rootScope.newItemFromHome;
      $rootScope.newItemFromHome =null;
    }
  }


  //console.log($scope.Item);

  $("#itemDataName").attr("placeholder",$scope.Item.name);
  

    $scope.scrollTop = function()
    {
      $ionicScrollDelegate.scrollTop(true);
    }

    ///////
    $ionicModal.fromTemplateUrl('views/lightbox.html', {
      scope: $scope,
      animation: 'slide-in-up'
    }).then(function(modal) {
      $scope.modal = modal;
    });

    $scope.openModal = function() {
      $ionicSlideBoxDelegate.slide(0);
      $scope.modal.show();
    };

    $scope.closeModal = function() {
      $scope.modal.hide();
    };

    // Cleanup the modal when we're done with it!
    $scope.$on('$destroy', function() {
      $scope.modal.remove();
    });
    // Execute action on hide modal
    $scope.$on('modal.hide', function() {
      // Execute action
    });
    // Execute action on remove modal
    $scope.$on('modal.removed', function() {
      // Execute action
    });
    $scope.$on('modal.shown', function() {
      
      //console.log('Modal is shown!');
    });

    // Call this functions if you need to manually control the slides
    $scope.next = function() {
      $ionicSlideBoxDelegate.next();
    };
  
    $scope.previous = function() {
      $ionicSlideBoxDelegate.previous();
    };
  
    $scope.goToSlide = function() {
      $scope.modal.show();

      setTimeout(function() { $ionicSlideBoxDelegate.slide($scope.Item.default_image.image_index);}, 100);    

    }
  
    // Called each time the slide changes
    $scope.slideChanged = function(index) {
      $scope.slideIndex = index;
    };
  

///////
  $scope.takePhoto = function()
  {
   $scope.selectImage("photo");
  }
 
  $scope.showGallery = function() 
  {       
    $scope.selectImage("gallery");
  }

  $scope.selectImage = function(sourceType)
  {  
    var options = $scope.optionsForType(sourceType);

    $cordovaCamera.getPicture(options).then(function(imageUrl) 
    {
      var name = imageUrl.substr(imageUrl.lastIndexOf('/') + 1);

      if(name.indexOf('?') != -1) 
      {
        name = name.substr(0, name.lastIndexOf('?'));
        newName = $scope.makeid() + name;
      }

      var namePath = imageUrl.substr(0, imageUrl.lastIndexOf('/') + 1);
      var newName = $scope.makeid() + name;

      $cordovaFile.copyFile(namePath, name, cordova.file.dataDirectory, newName).then(function(info) 
      {
        var images_from_phone = [];

        var my_image = {
                    "image_name" : cordova.file.dataDirectory + newName,
                    "image_type" : sourceType
                    };

        images_from_phone.push(my_image); 

        $scope.Item.images = images_from_phone.concat($scope.Item.images);

        $timeout(function() { $scope.$apply(); });
  
        $("#itemImageSelection").slideUp();
        $("#editItemName").slideDown();       
  
      }, function(e) 
      {
          alert("Error: " + e);
      });
    });
  }

  $scope.makeid = function() 
  {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
 
    for (var i = 0; i < 5; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

    $scope.optionsForType =function(type) 
  {
      var destinationType = Camera.DestinationType.FILE_URI;
      var sourceType = Camera.PictureSourceType.CAMERA;
      var encodingType = Camera.EncodingType.JPEG;
      var popoverOptions = CameraPopoverOptions;
      var saveToPhotoAlbum = false;
      var targetWidth = 640;
      var targetHeight = 640;
      var correctOrientation = false;
      var quality = 100;

    switch (type) 
    {
      case "photo":
        sourceType =  Camera.PictureSourceType.CAMERA;        
        break;
      case "gallery":
        sourceType = Camera.PictureSourceType.PHOTOLIBRARY;
        break;
    }

 return {
        destinationType: destinationType,
        sourceType: sourceType,
        encodingType: encodingType,
        popoverOptions: popoverOptions,
        saveToPhotoAlbum: saveToPhotoAlbum,
        targetWidth: targetWidth,
        targetHeight: targetHeight,
        correctOrientation: correctOrientation,
        quality: quality
        };
  }


  $rootScope.showAlert = function(messageType, messageText) 
  {
    $ionicPopup.alert(
    {
      title: messageType,
      content: messageText
    }).then(function(res) {
      //console.log('Test Alert Box');

    });
  };

 $scope.convertFileToDataURLviaFileReader = function(url, callback){

    var xhr = new XMLHttpRequest();
    xhr.responseType = 'blob';
    xhr.onload = function() {
        var reader  = new FileReader();
        reader.onloadend = function () {
            callback(reader.result);
        }
        reader.readAsDataURL(xhr.response);
    };
    xhr.open('GET', url);
    xhr.send();
}

$scope.shareLocalImage = function(base64Image)
{

  var message = "";
  var subject = "GoBy Sharing";
  var file = null;
  var link = "";
  

    if(typeof $scope.Item.name != undefined && $scope.Item.name)
        message += $scope.Item.name +" ";

      if(typeof $scope.Item.formatted_address != undefined && $scope.Item.formatted_address)
        message += $scope.Item.formatted_address +" ";

      if(typeof $scope.Item.international_phone_number != undefined && $scope.Item.international_phone_number)
        message += $scope.Item.international_phone_number +" ";

      if(typeof $scope.Item.notes != undefined && $scope.Item.notes)
        message += $scope.Item.notes +" ";

      file = base64Image;

      if($scope.Item.maps_url != "")
      {
        link = $scope.Item.maps_url;
      }
      else if($scope.Item.website != "")
      {
       link = $scope.Item.website; 
      }

      message += " - Shared by GoBy!";
  
  $cordovaSocialSharing.share(message, subject, file, link) // Share via native share sheet
  .then(function(result) 
  {
    // Success!
    //$rootScope.toast('Item Shared');
      $rootScope.showToast('Item Shared');
  }, function(err) 
  {
    // An error occured. Show a message to the user
    //$rootScope.toast('ERROR: Item not Shared :'+ err);
    $rootScope.showToast('ERROR: Item not Shared :'+ err);
  }); 

  base64Image = null;
  file = null;
}

  $scope.shareItem = function()
  {

    if($scope.Item.default_image.image_type == "photo" || $scope.Item.default_image.image_type == "gallery")
    {
      $scope.convertFileToDataURLviaFileReader($scope.cItem.default_image.image_name, $scope.shareLocalImage);
    }
    else
    {
      var message = "";
      var subject = "GoBy Sharing";
      var file = null;
      var link = "";


    if(typeof $scope.Item.name != undefined && $scope.Item.name)
        message += $scope.Item.name +" ";

      if(typeof $scope.Item.formatted_address != undefined && $scope.Item.formatted_address)
        message += $scope.Item.formatted_address +" ";

      if(typeof $scope.Item.international_phone_number != undefined && $scope.Item.international_phone_number)
        message += $scope.Item.international_phone_number +" ";

      if(typeof $scope.Item.notes != undefined && $scope.Item.notes)
        message += $scope.Item.notes +" ";

      file = $scope.Item.default_image.image_name;

      if($scope.Item.maps_url != "")
      {
        link = $scope.Item.maps_url;
      }
      else if($scope.Item.website != "")
      {
       link = $scope.Item.website; 
      }

      message += " - Shared by GoBy!";

      $cordovaSocialSharing.share(message, subject, file, link) // Share via native share sheet
      .then(function(result) 
      {
        // Success!        
        $rootScope.showToast('Item Shared');        
      }, function(err) 
      {
        // An error occured. Show a message to the user
        $rootScope.showToast('ERROR: Item not Shared :'+ err);
      });

      file = null;
    }
  }

  $rootScope.arrayObjectIndexOf = function(myArray, searchTerm) 
  {
    for(var i = 0, len = myArray.length; i < len; i++) 
    {
      if (myArray[i].id === searchTerm.id) return i;
    }
    return -1;
  }

  $scope.deleteItem = function()
  {
    $ionicPopup.confirm(
    {
      title: "Delete Item",
      content: "Are you sure you would like to delete: " + $scope.Item.name +"?"
    }).then(function(res) 
    {
      if(res)
      {        
        //Delete the item form the Categorie's items
        for(var i=0; i< $rootScope.user.categories.length; i++)
        {
          var index = $rootScope.arrayObjectIndexOf($rootScope.user.categories[i].items, $scope.Item);
          //console.log(index);

          if(index >= 0)
          {
            $rootScope.user.categories[i].items.splice(index,1);
          }          
        }

        //Store the data in the local storage and AWS
        $rootScope.showToast('Saving');
        DbService.Store($rootScope.user, null);
        
        //Go to the Lists
        $state.go('app.home');
      }
    });
  }



  $scope.saveItem = function(goHome)
  {
    if($scope.newItem)
    {     
        if($("#itemDataName").val() != "")
        {
          $scope.Item.name = $("#itemDataName").val();
        }
        else
        {
          if($("#itemDataName").attr("placeholder") != "")
          {
            $scope.Item.name = $("#itemDataName").attr("placeholder");
          }          
        }

       // console.log("Name: "+$scope.Item.name);

        if($scope.Item.name == "")
        {
          $rootScope.showAlert("Warning","Please provide a name");          
        }
        else
        {          
          //Only selecte the categories that have been checked and add them to the Item's categories
          //console.log($rootScope.user.categories[0].items);

          for(var i=0; i< $rootScope.user.categories.length; i++)
          {
            if($rootScope.user.categories[i].checked)
            {                
                $rootScope.user.categories[i].items.push($scope.Item);              
            }
          }          
          // console.log($rootScope.user.categories[0].items);
          
          //Store the data in the local storage and AWS
          $rootScope.showToast('Saving');
          DbService.Store($rootScope.user, null);
          $state.go('app.home');    
          $scope.Item = null;
        }      
    }
    else
    {
        $("#categoryRequired").hide();

        if(document.getElementById('itemDataName').value != "")
        {
          $scope.Item.name = document.getElementById('itemDataName').value;  
        }
                
        //Store the data in the local storage and AWS
        $rootScope.showToast('Saving');
        DbService.Store($rootScope.user, null);

        if(goHome)
        {
          $state.go('app.home');            
          $scope.Item = null;
        }
      
    }
  }
 
})


.controller('FriendsCtrl', function($rootScope, $scope, DbService, UserService, $state, $ionicLoading)
{

 // console.log("in FriendsCtrl");

  //console.log($rootScope.user);

})


.controller('FriendCtrl', function($rootScope, $scope, $stateParams, $timeout, UserService, $ionicHistory)
{

 // console.log("in Friend");

  $rootScope.currentFriend = null;

  for(var i=0; i< $rootScope.user.friends.length; i++)
  {
    if($rootScope.user.friends[i].user_id == $stateParams.friendId)
    {
        $rootScope.currentFriend = $rootScope.user.friends[i];
    }
  }

  $scope.showFriends = function()
  {
    $rootScope.show_friends = true;
    $ionicHistory.goBack();
  }

})


;
