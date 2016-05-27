// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
angular.module('starter', ['ionic', 'controllers', 'services','ngCordova','pascalprecht.translate'])

.constant('config', {
    FBappIdProd: '1663498527242562',
    FBappIdSecret: '34acca6a5f91b6834b74941e71f1225d',
    AWSIdentityPoolId: 'eu-west-1:f9c1658b-a4c9-4f5f-b3c9-eb1b264f96cf',
    isOnline: false
})

.run(function($ionicPlatform, config, $cordovaNetwork, $rootScope) 
{
  $ionicPlatform.ready(function() 
  {   
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if(window.cordova && window.cordova.plugins.Keyboard) 
    {     
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);

      if($cordovaNetwork.isOnline())
      {
        config.isOnline = true;        
      }
      else
      {
        config.isOnline = false;
      }       
    }
    else
    {       
      if(navigator && navigator.onLine)
      {
        config.isOnline = true;  
      }
      else
      {
        config.isOnline = false;
      }    
    }

    if(config.isOnline)
    {
      $rootScope.connectionStatus = "connected";      
    }
    else
    {
      $rootScope.connectionStatus = "not-connected";
    }

    startWatching($rootScope.showConnectionStatus);
    $rootScope.showConnectionStatus($rootScope.connectionStatus);

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

    if(window.StatusBar) 
    {
      StatusBar.styleDefault();
    }

  });

  if(!ionic.Platform.isAndroid())
  {
    window.fbAsyncInit = function() {
      FB.init({
        appId      : config.FBappIdProd,
        xfbml      : true,
        version    : 'v2.5'
      });
    };

    (function(d, s, id){
       var js, fjs = d.getElementsByTagName(s)[0];
       if (d.getElementById(id)) {return;}
       js = d.createElement(s); js.id = id;
       js.src = "//connect.facebook.net/en_US/sdk.js";
       fjs.parentNode.insertBefore(js, fjs);
     }(document, 'script', 'facebook-jssdk'));
  }
})

.config(function($stateProvider, $urlRouterProvider, $ionicConfigProvider, $compileProvider, $translateProvider) 
{
  var userObject = JSON.parse(window.localStorage.GoByData || '{}');
  
  $ionicConfigProvider.views.maxCache(0);

  $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ftp|file|blob):|data:image\//);

  $stateProvider.state('welcome', 
  {
    url: '/welcome',
    templateUrl: "views/welcome.html",
    controller: 'WelcomeCtrl'
  })
  .state('app', 
  {
    url: "/app",
    abstract: true,
    templateUrl: "views/sidemenu.html",
    controller: 'AppCtrl'
  })
  .state('app.home', 
  {
    url: "/home",
    views: 
    {
      'menuContent': 
      {
        templateUrl: "views/home.html",
        controller: 'HomeCtrl'
      },
      cache: false
    }
  })
  .state('app.friends', 
  {
    url: "/friends",
    views: 
    {
      'menuContent': 
      {
        templateUrl: "views/friends.html",
        controller: 'FriendsCtrl'
      },
      cache: false
    }
  })
      .state('app.friend', {
    url: '/friends/:friendId',
    views: {
      'menuContent': {
        templateUrl: 'views/friend.html',
        controller: 'FriendCtrl'
      },
      cache: false
    }
  })
   .state('app.item_new', 
  {
    url: "/item",
    views: 
    {
      'menuContent': 
      {
        templateUrl: "views/item.html",
        controller: 'ItemCtrl'
      },
      cache: false
    }
  })    
  .state('app.item', {
    url: '/item/:itemId',
    views: {
      'menuContent': {
        templateUrl: 'views/item.html',
        controller: 'ItemCtrl'
      },
      cache: false
    }
  })
  ;

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/welcome');

    var translationsEN = {
          home: "Home",
          edit_categories: "Edit Categories",
          add_a_place: "Add a place",
          working_offline: "Working Offline",
          working_online: "Working Online",
          connecting: "Connecting",
          add_a_new_item: "Add a new Item",
          add_a_new_item_to_this_category: "Add a new item to this category",
          categories: "Categories",
          photo: "Photo",
          my_gallery: "My Gallery",
          add_an_image: "Add an Image",
          my_notes: "My Notes",
          address: "Address",
          phone_number: "Phone Number",
          website: "Website",
          open_now: "Open Now",
          closed_now: "Closed Now",
          public: "Public",
          private: "Private",
          visibility: "Visibility",
          my_friends: "My Friends",
          can: "can",
          cant: "can't",
          see_this_item: "see this Item",
          please_select_atleast_one_category: "Please select atleast one category",
          add_a_category: "Add a Category",
          delete_this_category: "Delete this category",
          reorder: "Reorder",
          back: "Back",
          this_category_doesnt_have_any_items_yet: "This category doesn't have any items yet",
          there_are_no_available_categories: "There are no available categories",
          s_notes: "'s Notes",
          logout: "Logout",
          english: "English",
          french: "Français"         
        };
 
    var translationsFR= {
          home: "Accueil",
          edit_categories: "Modifier les catégories",
          add_a_place: "Ajouter un endroit",
          working_offline: "Travail hors ligne",
          working_online: "Travailler en ligne",
          connecting: "Connexion  ",
          add_a_new_item: "Ajouter un nouvel élément",
          add_a_new_item_to_this_category: "Ajouter un nouvel élément à cette catégorie",
          categories: "Catégories ",
          photo: "photo",
          my_gallery: "Ma galerie ",
          add_an_image: "Ajouter une image",
          my_notes: "Mes notes  ",
          address: "adresse",
          phone_number: "Numéro de téléphone",
          website: "site web   ",
          open_now: "Maintenant ouvert",
          closed_now: "Fermé Maintenant ",
          public: "publique   ",
          private: "privé",
          visibility: "Visibilité ",
          my_friends: "Mes amis   ",
          can: "peut ",
          cant: "ne peut pas",
          see_this_item: "voir cet article ",
          please_select_atleast_one_category: "S'il vous plaît sélectionner au moins une catégorie",
          add_a_category: "Ajouter une catégorie",
          delete_this_category: "Supprimer cette catégorie",
          reorder: "Réorganiser",
          back: "Retour",
          this_category_doesnt_have_any_items_yet: "Cette catégorie n'a pas encore tous les éléments",
          there_are_no_available_categories: "Il n'y a pas de catégories disponibles",
          s_notes: "notes",
          logout: "Déconnexion"
        };


  $translateProvider.translations('en', translationsEN);
  $translateProvider.translations('fr', translationsFR);

  $translateProvider.preferredLanguage(userObject.language);
  $translateProvider.fallbackLanguage("en");
})
