Cards = new Mongo.Collection("cards");

if (Meteor.isClient) {
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
    // submit new card
    "submit .new-card": function (event) {
      event.preventDefault();
      // get values from form
      var text          = event.target.text.value,
          title         = event.target.title.value,
          type          = event.target.cardTypeOption.value,
          triggerDate   = event.target.cardTriggerDate.value,
          datePublished = Session.get('time');
      // insert the new card in db
      Meteor.call("addCard", title, text, datePublished, type, triggerDate);
      //Cards.insert({
      //  title: title,
      //  text: text,
      //  datePublished: datePublished,
      //  type: type,
      //  triggerDate: triggerDate,
      //  checked: false
      //});
      // clear fields
      event.target.text.value = "";
      event.target.title.value = "";
      event.target.cardTriggerDate.value = "";
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
    cards: function () {
      if (Session.get('showFavs')) {
        return Cards.find({checked: {$ne: false}}, {sort: {triggerDate: -1}});
      } else {
        return Cards.find({}, {sort: {triggerDate: -1}});
      }
    },
    showFavs: function () {
      return Session.get('showFavs');
    },
    time: function () {
      return Session.get("time");
    }
  });
  Template.body.events({
    "click .toggle-favs": function (event) {
      Session.set('showFavs', ! Session.get('showFavs'));
      event.target.checked = Session.get('showFavs'); 
    }
  });

  Template.card.helpers({
    typeIs: function (type) {
      console.log(this.type, type);
      return this.type === type;
    },
    splitLines: function (text) {
      return text.split(/\r?\n/);
    },
    released: function (time) {
      console.log('release: ' + time, 'vs time: ' + Session.get('time'));
      console.log();
      return moment(time).isSameOrBefore(Session.get('time'));
    }
  });
  Template.card.events({
    "click .toggle-checked": function () {
      Meteor.call("setFaved", this._id, ! this.checked);
    },
    "click .delete": function () {
      Meteor.call("deleteCard", this._id);
    }
  });

  Accounts.ui.config({
    passwordSignupFields: 'USERNAME_ONLY'
  });
}

Meteor.methods({
  addCard: function (title, text, datePublished, type, triggerDate) {
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }
    // insert the new card in db
    Cards.insert({
      title: title,
      text: text,
      datePublished: datePublished,
      type: type,
      triggerDate: triggerDate,
      checked: false
    });
  },
  deleteCard: function (taskId) {
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }
    Cards.remove(taskId);
  },
  setFaved: function (taskId, setChecked) {
    Cards.update(taskId, {$set: {checked: setChecked}});
  }
});

if (Meteor.isServer) {
  Meteor.methods({
    getServerTime: function () {
      var _time = moment().format();
      return _time;
    }
  });
}