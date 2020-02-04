import DBHelper from './dbhelper';


let restaurants,
    neighborhoods,
    cuisines
var map
var markers = []

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
    fetchNeighborhoods();
    fetchCuisines();
    updateRestaurants();
    setEventListeners();
});

/**
 * Set event listeners for filter changing
 */
var setEventListeners = () => {
    var neighborHoodSelect = document.getElementById('neighborhoods-select');
    neighborHoodSelect.addEventListener('change', function () {
        updateRestaurants();
    });

    var cuisineSelect = document.getElementById('cuisines-select');
    cuisineSelect.addEventListener('change', function () {
        updateRestaurants();
    });
}

/**
 * Fetch all neighborhoods and set their HTML.
 */
const fetchNeighborhoods = () => {
    DBHelper.fetchNeighborhoods((error, neighborhoods) => {
        if (error) { // Got an error
            console.error(error);
        } else {
            self.neighborhoods = neighborhoods;
            fillNeighborhoodsHTML();
        }
    });
}

/**
 * Set neighborhoods HTML.
 */
const fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
    const select = document.getElementById('neighborhoods-select');
    neighborhoods.forEach(neighborhood => {
        const option = document.createElement('option');
        option.innerHTML = neighborhood;
        option.value = neighborhood;
        select.append(option);
    });
}

/**
 * Fetch all cuisines and set their HTML.
 */
const fetchCuisines = () => {
    DBHelper.fetchCuisines((error, cuisines) => {
        if (error) {  
            console.error(error);
        } else {
            self.cuisines = cuisines;
            fillCuisinesHTML();
        }
    });
}

/**
 * Set cuisines HTML.
 */
const fillCuisinesHTML = (cuisines = self.cuisines) => {
    const select = document.getElementById('cuisines-select');

    cuisines.forEach(cuisine => {
        const option = document.createElement('option');
        option.innerHTML = cuisine;
        option.value = cuisine;
        select.append(option);
    });
}

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
    let loc = {
        lat: 40.722216,
        lng: -73.987501
    };
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 12,
        center: loc,
        scrollwheel: false,
        title: "Restaurant Map",
    });

    window.addEventListener('load', function () {
        const map = document.getElementById("map");
        map.getElementsByTagName("iframe")[0].title = "Restaurants map";
    })

    updateRestaurants();
}

/**
 * Update page and map for current restaurants.
 */
const updateRestaurants = () => {
    const cSelect = document.getElementById('cuisines-select');
    const nSelect = document.getElementById('neighborhoods-select');

    const cIndex = cSelect.selectedIndex;
    const nIndex = nSelect.selectedIndex;

    const cuisine = cSelect[cIndex].value;
    const neighborhood = nSelect[nIndex].value;

    DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
        if (error) { // Got an error!
            console.error(error);
        } else {
            resetRestaurants(restaurants);
            fillRestaurantsHTML();
        }
    })
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
const resetRestaurants = (response) => {
    // Remove all restaurants
    self.restaurants = [];
    const ul = document.getElementById('restaurants-list');
    ul.innerHTML = '';

    // Remove all map markers
    markers.forEach(m => m.setMap(null));
    markers = [];
    restaurants = response;

}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
const fillRestaurantsHTML = (response = restaurants) => {
    const ul = document.getElementById('restaurants-list');
    restaurants.forEach(restaurant => {
        ul.append(createRestaurantHTML(restaurant));
    });
    addMarkersToMap();
}

/**
 * Create restaurant HTML.
 */
const createRestaurantHTML = (restaurant) => {
    const li = document.createElement('li');
    const image = document.createElement('img');
    const undefined = DBHelper.imageUrlForRestaurant(restaurant).split('/').pop();

    image.className = 'restaurant-img';
    image.setAttribute("alt", "Image of \"" + restaurant.name + "\" restaurant");
    image.src = DBHelper.imageUrlForRestaurant(restaurant);

    if (undefined.indexOf('undefined') >= 0) {
        image.src = "/img/placeholder.jpg";
    }

    li.append(image);
    const name = document.createElement('h2');
    name.innerHTML = restaurant.name;
    li.append(name);

    const neighborhood = document.createElement('p');
    neighborhood.innerHTML = restaurant.neighborhood;
    li.append(neighborhood);

    const address = document.createElement('p');
    address.innerHTML = restaurant.address;
    li.append(address);

    const more = document.createElement('a');
    const favoriteBtn = document.createElement('button');
    favoriteBtn.setAttribute('role', 'switch');
    if (restaurant.is_favorite == 'false' || restaurant.is_favorite == false) {
        favoriteBtn.innerHTML = 'Favorite';
        favoriteBtn.className = 'favoriteBtn false';
        favoriteBtn.setAttribute('aria-checked', "false");
    } else {
        favoriteBtn.className = 'favoriteBtn true';
        li.classList.add('favorite');
        favoriteBtn.innerHTML = 'Dislike';
        favoriteBtn.setAttribute('aria-checked', "true");
    }
    favoriteBtn.addEventListener('click', function () {
        setFavorite(restaurant.id, li, favoriteBtn);
    })

    more.innerHTML = 'View Details';
    more.href = DBHelper.urlForRestaurant(restaurant);
    li.append(more)
    li.append(favoriteBtn);
    li.classList.add('hidden');

    return li
}


/**
 * Handle favorite  
 */
const setFavorite = (restaurantId, li, favoriteBtn) => {

    let isFavorite = restaurants[restaurantId - 1].is_favorite;

    DBHelper.putFavorite(restaurantId, isFavorite)
        .then((response) => {
            restaurants[response.id - 1] = response;
            li.classList.toggle('favorite');
            if (li.classList.contains('favorite')) {
                favoriteBtn.setAttribute('aria-checked', "true");
                favoriteBtn.innerHTML = 'Dislike';
                alert('Restaurant added to favorites');
            } else {
                favoriteBtn.innerHTML = 'Favorite';
                favoriteBtn.setAttribute('aria-checked', "false");
                alert('Restaurant removed from favorites');
            }
        })
        .catch((error) => {
            console.error(error);
        });
}
/**
 * Add markers for current restaurants to the map.
 */
const addMarkersToMap = (response = restaurants) => {
    response.forEach(restaurant => {
        // Add marker to the map
        const marker = DBHelper.mapMarkerForRestaurant(restaurant, map);
        google.maps.event.addListener(marker, 'click', () => {
            window.location.href = marker.url
        });
        markers.push(marker);
    });
}