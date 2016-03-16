Cards = new Mongo.Collection("cards");

if (Meteor.isClient) {
  Session.set('uitzending', moment().format('2016-03-17 20:30', 'DD-MM-YYYY HH:mm'));
  Session.set('showFavs', false);

  Template.registerHelper('formatDate', function(date) {
    return moment(date).format('DD-MM-YYYY');
  });

  Template.body.helpers({
    cards: function () {
      if (Session.get('showFavs')) {
        return Cards.find({checked: {$ne: false}}, {sort: {datePublished: -1}});
      } else {
        return Cards.find({}, {sort: {datePublished: -1}});
      }
    },
    showFavs: function () {
      return Session.get('showFavs');
    }
  });

  Template.body.events({
    "submit .new-card": function (event) {
      event.preventDefault();
      var text = event.target.text.value,
          title = event.target.title.value,
          type = event.target.cardTypeOption.value;

      Cards.insert({
        title: title,
        text: text,
        datePublished: new Date(),
        type: type
      });

      event.target.text.value = "";
      event.target.title.value = "";
    },
    "click .toggle-favs": function (event) {
      Session.set('showFavs', ! Session.get('showFavs'));
      event.target.checked = Session.get('showFavs'); 
      console.log('clicked', event);
    }
  });

  Template.header.helpers({
    currentDate: function () {
      return Session.get('uitzending')
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
  Meteor.startup(function () {
    // code to run on server at startup
  });
}