Cards = new Mongo.Collection("cards");

if (Meteor.isClient) {
  // uitzending 
  Session.set('uitzending', moment().format('2016-03-23 20:30:00', 'DD-MM-YYYY HH:mm:ss Z'));
  Session.set('showFavs', false);
  Session.set('cardType', null);

  Meteor.startup(function () {
    setInterval(function () {
      Meteor.call("getServerTime", function (error, result) {
        Session.set("time", result);
      });
    }, 1000);
  });

  Template.registerHelper('formatDate', function(date) {
    return moment(date).format('DD-MM-YYYY HH:mm:ss Z');
  });

  Template.header.helpers({
    currentDate: function () {
      return Session.get('uitzending');
    }
  });

  Template.admin.helpers({
    cardTypeIs: function (cardType) {
      return Session.get('cardType') === cardType;
    }
  });

  Template.admin.events({
    "submit .new-card": function (event) {
      event.preventDefault();
      var text          = event.target.text.value,
          title         = event.target.title.value,
          type          = event.target.cardTypeOption.value,
          triggerDate   = event.target.cardTriggerDate.value,
          datePublished = Session.get('time');

      console.log('input:', moment(triggerDate).unix());
      console.log('input:', moment(Session.get('time')).unix());

      Cards.insert({
        title: title,
        text: text,
        datePublished: datePublished,
        type: type,
        triggerDate: triggerDate 
      });

      event.target.text.value = "";
      event.target.title.value = "";
      event.target.cardTriggerDate.value = "";
    },
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
        return Cards.find({checked: {$ne: false}}, {sort: {datePublished: -1}}).filter;
      } else {
        return Cards.find({}, {sort: {datePublished: -1}});
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
      console.log('clicked', event);
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
      Cards.update(this._id, {
        $set: {checked: ! this.checked}
      });
    },
    "click .delete": function () {
      Cards.remove(this._id);
    }
  });

  Accounts.ui.config({
    passwordSignupFields: 'USERNAME_ONLY'
  });
}

if (Meteor.isServer) {
  Meteor.methods({
    getServerTime: function () {
      var _time = moment().format();
      console.log(_time);
      return _time;
    }
  });
}