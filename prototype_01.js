Cards = new Mongo.Collection("cards");

if (Meteor.isServer) {
  Meteor.publish("cards", function () {
    return Cards.find();
  });
  
  Meteor.methods({
    getServerTime: function () {
      var _time = moment().format();
      return _time;
    }
  });
}

if (Meteor.isClient) {
  Meteor.subscribe("cards");

  // Uitzending 
  Session.set('uitzending', moment().format('DD-MM-YYYY') + ' 18:15');
  Session.set('showFavs', false); // -> toggles if favorites are shown
  Session.set('cardType', null);  // -> temporary stores card type

  // Store the server time in session
  Meteor.startup(function () {
    setInterval(function () {
      Meteor.call("getServerTime", function (error, result) {
        Session.set("time", result);
      });
    }, 1000);
  });

  // Format date like 13-03-2016 16:34:02
  Template.registerHelper('formatDate', function(date) {
    return moment(date).format('DD-MM-YYYY HH:mm:ss');
  });

  // Get the current day from session
  Template.header.helpers({
    currentDate: function () {
      return Session.get('uitzending');
    }
  });

  // Checks if the given cardtype is equal to 
  // the cardtype of the card in which the check is made
  Template.admin.helpers({
    cardTypeIs: function (cardType) {
      return Session.get('cardType') === cardType;
    }
  });
  Template.admin.events({
    // Submit new card
    "submit .new-card": function (event) {
      event.preventDefault();
      var submittedCardType = Session.get('cardType'),
        datePublished       = Session.get('time'),
        triggerDate         = event.target.cardTriggerDate;
    
      if (submittedCardType === 'textCard') {
        var text        = event.target.text.value,
          title         = event.target.title.value,
          datePublished = Session.get('time');

        // Insert the new card in db
        Meteor.call("addTextCard", title, text, datePublished, triggerDate);

        // Clear fields
        event.target.text.value = "";
        event.target.title.value = "";
        event.target.cardTriggerDate.value = "";
      }

      if (submittedCardType === 'pollCard') {
        var title       = event.target.title.value,
          optionOne     = event.target.optionOne.value,
          optionTwo     = event.target.optionTwo.value;

        Meteor.call("addPollCard", title, optionOne, optionTwo, triggerDate, datePublished)
        
        // Clear fields
        event.target.title.value = "";
        event.target.optionOne.value = "";
        event.target.optionTwo.value = "";
        event.target.cardTriggerDate.value = "";
      }
    },
    // card-type selection
    "click .card-type": function (event) {
      event.stopPropagation();
      event.preventDefault();
      event.target.childNodes[1].checked = !event.target.childNodes[1].checked;
      Session.set('cardType', event.target.childNodes[1].value);
    }
  });

  Template.body.helpers({
    // Gets all cards
    cards: function () {
      if (Session.get('showFavs')) {
        return Cards.find({checked: {$ne: false}}, {sort: {triggerDate: -1}});
      } else {
        return Cards.find({}, {sort: {triggerDate: -1}});
      }
    },
    // Status of showFavs (boolean)
    showFavs: function () {
      return Session.get('showFavs');
    },
    // Gets curent time stored in session
    time: function () {
      return Session.get("time");
    }
  });
  Template.body.events({
    // Toggle favorites
    "click .toggle-favs": function (event) {
      Session.set('showFavs', ! Session.get('showFavs'));
      event.target.checked = Session.get('showFavs'); 
    }
  });

  Template.card.helpers({
    // Compares type
    typeIs: function (type) {
      console.log(this.type, type);
      return this.type === type;
    },
    // Splits text into lines on linebreak
    splitLines: function (text) {
      return text.split(/\r?\n/);
    },
    // Returns true if the card is released
    released: function (time) {
      return moment(time).isSameOrBefore(Session.get('time'));
    }
  });
  Template.card.events({
    // Set favorite
    "click .toggle-checked": function () {
      Meteor.call("setFaved", this._id, ! this.checked);
    },
    // Delete card
    "click .delete": function () {
      Meteor.call("deleteCard", this._id);
    },
    "click .poll-option": function (e) {
      Meteor.call("voteUp", this._id, e.target.classList[0]);
      console.log(this);
      console.log(e.target.classList[0]);
    }
  });

  // Login with username and password
  Accounts.ui.config({
    passwordSignupFields: 'USERNAME_ONLY'
  });
}

Meteor.methods({
  addTextCard: function (title, text, datePublished, triggerDate) {
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }
    // insert the new card in db
    Cards.insert({
      title: title,
      text: text,
      datePublished: datePublished,
      type: 'textCard',
      triggerDate: triggerDate,
      checked: false
    });
  },
  addPollCard: function (title, optionOne, optionTwo, datePublished, triggerDate) {
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }
    Cards.insert({
      title: title,
      optionOne: optionOne,
      countOne: 0,
      optionTwo: optionTwo,
      countTwo: 0,
      datePublished: datePublished, 
      type: 'pollCard', 
      triggerDate: triggerDate,
      checked: false
    });
  },
  deleteCard: function (cardId) {
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }
    Cards.remove(cardId);
  },
  setFaved: function (cardId, setChecked) {
    Cards.update(cardId, {$set: {checked: setChecked}});
  },
  // casts vote in a poll
  voteUp: function(cardId, option) {
    var action = {};
    action[option] = 1; 
    // action is equal to {'countOne': 1} or {'countTwo': 1}
    Cards.update(cardId, {$inc: action});
  }
});