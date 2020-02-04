import idb from 'idb';

var dbPromise = idb.open('restaurants-db', 3, function (upgradeDb) {
  switch (upgradeDb.oldVersion) {
    case 0:
      upgradeDb.createObjectStore('restaurants', { keyPath: 'id' });
    case 1:
      upgradeDb.createObjectStore('reviews', { keyPath: 'restaurant_id' });
    case 2:
      upgradeDb.createObjectStore('offline-reviews', { keyPath: 'restaurant_id' });
  }
});

class DBHelper {
  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    //const port = 80; // Port for development
    const port = 1337; // Port for testing
    return `http://localhost:${port}`;
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {

    fetch(`${DBHelper.DATABASE_URL}/restaurants`)
      .then(res => res.json())
      .then((out) => {
        const restaurants = out;

        if (navigator.serviceWorker) {
          dbPromise.then(db => {
            if (!db) return;

            var tx = db.transaction('restaurants', 'readwrite');
            var store = tx.objectStore('restaurants');

            restaurants.forEach(restaurant => store.put(restaurant));

          });
        }
        callback(null, restaurants);

      }).catch(err => console.error(err))

  }

  /**
   * Fetch restaurant's reviews by ID
   */
  static fetchReviewsById(id) {
    return new Promise((resolve, reject) => {

      DBHelper.fetchIDBReviews().then(function (data) {

        if (!navigator.onLine) {
          resolve(data[0]);
        }
        else {
          fetch(`${DBHelper.DATABASE_URL}/reviews/?restaurant_id=${id}`)
            .then(data => {
              if (data.ok) {
                return data.json();
              }
              reject(new Error(`Error status code : ${data.status}`));
            })
            .then(data => {
              DBHelper.updateRestaurantReview(data);
              resolve(data);
            })
            .catch(err => {
              reject(err);
            });
        }
      });

    });

  }

  /**
   * Get cached reviews from IDB
   */
  static fetchIDBReviews() {

    return dbPromise.then(db => {
      if (!db) return db;

      var tx = db.transaction('reviews');
      var store = tx.objectStore('reviews');

      return store.getAll();
    });
  }

  /**
   * Update restaurant's review
   */
  static updateRestaurantReview(review) {
    dbPromise.then(db => {
      if (!db) return db;

      var tx = db.transaction('reviews', 'readwrite');
      var store = tx.objectStore('reviews');

      review.restaurant_id = parseInt(review[0].restaurant_id);
      store.put(review);

      return tx.complete;
    })
  }

  /**
   * Save offline review
   */
  static saveReviewOffline(id, name, rating, comment) {
    const offlineReview = { restaurant_id: id, name: name, rating: rating, comments: comment };

    dbPromise.then(db => {
      if (!db) return;

      var tx = db.transaction('offline-reviews', 'readwrite');
      var store = tx.objectStore('offline-reviews');

      store.put(offlineReview);

      return tx.complete;
    })
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }


  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/img/${restaurant.photograph}.jpg`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP
    }
    );
    return marker;
  }

  /**
   * Post review
   */
  static postReview(id, name, rating, comment) {

    const post = { restaurant_id: id, name: name, rating: rating, comments: comment };
    return new Promise((resolve, reject) => {
      fetch(`${DBHelper.DATABASE_URL}/reviews`, {
        method: 'POST',
        body: JSON.stringify(post)
      }).then(response => {
        if (response.ok) {
          DBHelper.updateRestaurantReview(post);
          resolve(response.json());
        }
        reject(new Error(`ERROR, status code: ${response.status}`));
      }).catch(err => {
        reject(err);
      });
    });
  }


  /**
   * Post review after app becomes online
   */
  static postReviewOffline(id) {
    return new Promise((resolve, reject) => {

      dbPromise.then(db => {
        if (!db) return;

        var tx = db.transaction('offline-reviews');
        var store = tx.objectStore('offline-reviews');

        return store.get(id);
      }).then(review => {
        DBHelper.postReview(review.restaurant_id, review.name, review.rating, review.comments)
          .then(data => {
            dbPromise.then(function (db) {
              var tx = db.transaction('offline-reviews', 'readwrite');
              var store = tx.objectStore('offline-reviews');

              store.delete(id);

              return tx.complete;
            });
            resolve(data);
          }).catch(err => {
            reject(err);
          });
      });
    });
  }

  /**
    * Send PUT request 
    */
  static putFavorite(restaurantId, isFavorite) {

    if (isFavorite === 'false') {
      isFavorite = true;
    } else {
      isFavorite = false;
    }

    return new Promise((resolve, reject) => {
      fetch(`${DBHelper.DATABASE_URL}/restaurants/${restaurantId}/?is_favorite=${isFavorite}`, {
        method: 'PUT'
      })
        .then((response) => {
          if (response.ok) {
            resolve(response.json());
          } else {
            reject(new Error(`ERROR, status code:  ${res.status}`));
          }
        }).catch(err => {
          reject(err);
        });
    });
  }
}

module.exports = DBHelper;

