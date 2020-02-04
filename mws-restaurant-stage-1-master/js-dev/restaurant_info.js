import DBHelper from './dbhelper';

let restaurant;
var map;
let reviews;
let interval;

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
}

/**
 * Get current restaurant from page URL.
 */
const fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
const fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  image.setAttribute("alt", "Image of \"" + restaurant.name + "\" restaurant");

  const undefined = DBHelper.imageUrlForRestaurant(restaurant).split('/').pop();

  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  if (undefined.indexOf('undefined') >= 0) {
    image.src = "/img/placeholder.jpg";
  }

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  window.addEventListener('load', function () {
    var map = document.getElementById("map");
    map.getElementsByTagName("iframe")[0].title = restaurant.address;
  });

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
const fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
const fillReviewsHTML = () => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h3');
  title.innerHTML = 'Reviews';
  container.appendChild(title);
  let ul;
  const id = getParameterByName('id');
  DBHelper.fetchReviewsById(id)
    .then(reviews => {
      if (reviews.length == 0) {
        const noReviews = document.createElement('p');
        noReviews.innerHTML = 'No reviews yet. Be the first one!';
        container.appendChild(noReviews);
      } else {
        ul = document.getElementById('reviews-list');
        reviews.reverse().forEach(review => {
          ul.appendChild(createReviewHTML(review));
        });
        container.appendChild(ul);
      }

      setReviewForm(container, reviews, ul);

    })
    .catch(err => {
      console.error(err);
    });
}

/**
 * Create review HTML and add it to the webpage.
 */
const createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = new Date(review.updatedAt).toDateString();
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

const setReviewForm = (container, restaurant, ul) => {
  const form = document.createElement('form');
  const textArea = document.createElement('textarea');
  const sendButton = document.createElement('button');
  const input = document.createElement('input');
  const label = document.createElement('label');

  label.setAttribute('for', 'name');
  label.innerHTML = 'Post review';

  input.type = 'text';
  input.id = 'name';
  input.placeholder = 'Your name';
  input.required = true;

  textArea.id = 'review-text';
  textArea.placeholder = 'Post a review about this restaurant';
  textArea.required = true;
  textArea.setAttribute('aria-label', 'Post a review about this restaurant.');

  sendButton.type = 'submit';
  sendButton.innerHTML = 'Send';
  sendButton.setAttribute('aria-label', 'Send');

  form.id = 'review-form';

  form.append(label);
  form.append(input);
  form.append(textArea);
  form.append(ratingOptions());
  form.append(sendButton);

  container.appendChild(form);

  setFormListener(form, restaurant.id, ul);
}

//Create rating options
const ratingOptions = () => {
  const ratingDiv = document.createElement('div');
  const label = document.createElement('label');
  label.innerHTML = 'Rate restaurant: ';
  ratingDiv.appendChild(label);
  ratingDiv.classList.add('rating-container');
  label.htmlFor = `rating`;

  const rateList = document.createElement("select");
  rateList.id = "rate";
  rateList.name = "rating";
  rateList.required = true;
  for (let i = 0; i <= 5; i++) {
    const option = document.createElement("option");
    if (i === 0) {
      option.value = '*';
      option.text = '*';
      option.selected = true;
      rateList.appendChild(option);
    }
    else {
      option.value = i;
      option.text = i;
      rateList.appendChild(option);
    }
  }
  ratingDiv.appendChild(rateList);

  return ratingDiv;
}

const setFormListener = (form, id, ul) => {
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const name = stripHtmlTags(document.getElementById('name').value);
    const reviewText = stripHtmlTags(document.getElementById('review-text').value);
    let ratingValue = document.querySelector('#rate option:checked').value
    let rating;
    if (ratingValue !== "*") {
      rating = parseInt(ratingValue);
    } else {
      alert('Rate restaurant');
      return;
    }

    const id = parseInt(getParameterByName('id'));
    postReview(id, name, rating, reviewText, ul, form);

  }, false);
}

function postReview(id, name, rating, reviewText, ul, form) {

  if (navigator.onLine) {
    DBHelper.postReview(id, name, rating, reviewText)
      .then(data => {
        form.reset();
        alert('Review is posted.');
        ul.insertBefore(createReviewHTML(data), ul.childNodes[0]);
      })
      .catch(err => {
        console.log(err);
      })
  } else {
    alert("Connection problem. Review will be posted after successful connection to the internet.", 2000);
    DBHelper.saveReviewOffline(id, name, rating, reviewText)
    interval = setInterval(() => {
      isOnline(id, ul, form);
    }, 5000);
  }
}


function isOnline(id, ul, form) {
  if (navigator.onLine) {
    alert("Sending review.", 1000);
    clearInterval(interval);
    DBHelper.postReviewOffline(id)
      .then(data => {
        alert('Review is posted.');
        form.reset();
        ul.insertBefore(createReviewHTML(data), ul.childNodes[0]);
      });
  }
}


/**
 * Add restaurant name to the breadcrumb navigation menu
 */
const fillBreadcrumb = (restaurant = self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
const getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

/**
 * Strip html tags
 */

const stripHtmlTags = (string) => {
  return string.replace(/(<([^>]+)>)/ig, "");
}