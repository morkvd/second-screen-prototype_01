Cards = new Mongo.Collection("cards");
//console.log(Cards.find({}, {sort: {triggerDate: -1}}));

if (Meteor.isServer) {
  Meteor.publish("cards", () => Cards.find());

  Meteor.methods({
    getServerTime: () => {
      var _time = moment().format();
      return _time;
    }
  });
}

if (Meteor.isClient) {
  Meteor.subscribe("cards");

  // Uitzending 
  Session.set('uitzending', `${ moment().format('DD-MM-YYYY') } 18:15`);

  // Toggles if favorites are shown
  Session.set('showFavs', false);

  // Temporary stores selected card type in admin area
  Session.set('cardType', null);  

  // Store the server time in session
  Meteor.startup(() => {
    setInterval(() => {
      Meteor.call("getServerTime", (error, result) => Session.set("time", result) );
    }, 1000);
  });

  // Format date like 13-03-2016 16:34:02
  Template.registerHelper('formatDate', (date, formatString) => moment(date).format(formatString));

  // Get the current day from session
  Template.header.helpers({
    currentDate: () => Session.get('uitzending') 
  });

  // Checks if the given cardtype is equal to 
  // the cardtype of the card in which the check is made
  Template.admin.helpers({
    cardTypeIs: cardType => Session.get('cardType') === cardType,
    // Gets curent time stored in session
    time: () => Session.get("time")
  });
  Template.admin.events({
    // Submit new card
    "submit .new-card": event => {
      event.preventDefault();
      var submittedCardType = Session.get('cardType'),
        datePublished       = Session.get('time'),
        triggerDate         = event.target.cardTriggerDate.value;
    
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

        Meteor.call("addPollCard", title, optionOne, optionTwo, datePublished, triggerDate);
        
        // Clear fields
        event.target.title.value = "";
        event.target.optionOne.value = "";
        event.target.optionTwo.value = "";
        event.target.cardTriggerDate.value = "";
      }
    },
    // card-type selection
    "click .card-type": event => {
      event.stopPropagation();
      event.preventDefault();
      event.target.childNodes[1].checked = !event.target.childNodes[1].checked;
      Session.set('cardType', event.target.childNodes[1].value);
    }
  });

  Template.body.helpers({
    // Gets all cards
    cards: () => {
      if (Session.get('showFavs')) {
        return Cards.find({checked: {$ne: false}}, {sort: {triggerDate: -1}});
      } else {
        return Cards.find({}, {sort: {triggerDate: -1}});
      }
    },
    // Status of showFavs (boolean)
    showFavs: () => Session.get('showFavs')
  });
  Template.body.events({
    // Toggle favorites
    "click .toggle-favs": event => {
      Session.set('showFavs', ! Session.get('showFavs'));
      event.target.checked = Session.get('showFavs'); 
    }
  });

  Template.card.helpers({
    // Compares type
    typeIs: function (type) {
      return this.type === type;
    },
    // Splits text into lines on linebreak
    splitLines: text => text.split(/\r?\n/),
    // Returns true if the card is released
    released: time => moment(time).isSameOrBefore(Session.get('time')),
    // Turns raw vote counts into percentages; returns percentage of valueOne
    percentOf: (valueOne, valueTwo) => `${ (valueOne / ((valueOne + valueTwo) / 100)).toFixed(1) }%`
  });
  Template.card.events({
    // Set favorite
    "click .toggle-checked": function () {
      Meteor.call("setFaved", this._id, ! this.checked);
    },
    // Delete card
    "click .delete": function (e) {
      e.preventDefault();
      Meteor.call("deleteCard", this._id);
    },
    // Vote in poll
      // looks at the first class of the .poll-option element clicked to 
      // determine which counter needs to be incremented 
      // NOTE TO FUTURE SELF: this is horrible and should be improved
    "click .poll-option": function (e) {
      if (! Meteor.userId()) {
        $(`#${this._id} .votebutton`).addClass('hide')
        $(`#${this._id}`).addClass('cover');
      }      
      Meteor.call("voteUp", this._id, e.currentTarget.classList[0]);
    }
  });

  // Login with username and password
  Accounts.ui.config({
    passwordSignupFields: 'USERNAME_ONLY'
  });
}

Meteor.methods({
  addTextCard: (title, text, datePublished, triggerDate) => {
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
  addPollCard: (title, optionOne, optionTwo, datePublished, triggerDate) => {
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }
    Cards.insert({
      title: title,
      optionOne: optionOne,
      countOne: 1,
      optionTwo: optionTwo,
      countTwo: 1,
      datePublished: datePublished, 
      type: 'pollCard', 
      triggerDate: triggerDate,
      checked: false
    });
  },
  deleteCard: cardId => {
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }
    Cards.remove(cardId);
  },
  setFaved: (cardId, setChecked) => {
    Cards.update(cardId, {$set: {checked: setChecked}});
  },
  // casts vote in a poll
  voteUp: (cardId, option) => {
    var action = {};
    action[option] = 1; 
    // action is equal to {'countOne': 1} or {'countTwo': 1} depending on which button is clicked
    Cards.update(cardId, {$inc: action});
  }
});