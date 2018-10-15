const rp = require("request-promise");
const prompt = require("prompt");
const { splitEvery, pipe } = require("rambda");
const Promise = require("bluebird");

prompt.get = Promise.promisify(prompt.get);
prompt.message = "";
prompt.delimiter = "";

/**
 * Retrieve all food trucks that are available the day of the week specified
 * @param {Number} numDay number represntation of day of week
 * @return {Promise} array of Objects aka food trucks
 */
function retrieveTruckData(numDay) {
  var options = {
    uri: "https://data.sfgov.org/resource/bbb8-hzi6.json",
    qs: {
      dayorder: numDay
    },
    json: true
  };

  return rp(options)
    .then(resp => resp)
    .catch(err => Promise.reject(err));
}
/**
 * filters out trucks that are not opened at this time
 * @param {Array} foodTrucks Array of objects with start24 and end24 format in XX:XX
 * @return {Array} foodTrucks Array of objects
 */
function filterData(foodTrucks) {
  const currentTime = new Date();
  return foodTrucks.filter(({ start24, end24 }) =>
    inRange(
      currentTime,
      convertStringToDate(start24),
      convertStringToDate(end24)
    )
  );
}

/**
 * Taken a string and return a Date object
 * @param {String} dateString Format XX:XX
 * @return {Date}
 */
function convertStringToDate(dateString) {
  const d = new Date();
  const dateArray = dateString.split(":");
  d.setHours(dateArray[0]);
  d.setMinutes(dateArray[1]);
  return d;
}
/**
 * checks if targettime isbetween
 * @param {Date} targetTime
 * @param {Date} startTime
 * @param {Date} endTime
 */
function inRange(targetTime, startTime, endTime) {
  return startTime <= targetTime && targetTime < endTime;
}
/**
 * Sorts food Trucks by name
 * @param {Array} foodTrucks Array of objects with field applicant aka name
 * @return {Array} foodTrucks Array of objects
 */
function sortByName(foodTrucks) {
  return foodTrucks.slice().sort((a, b) => {
    return a.applicant.toLowerCase().localeCompare(b.applicant.toLowerCase());
  });
}
/**
 * Prints out the array displaying applicant aka name and location aka address
 * @param {Array} foodTrucks array of objects
 */
function printResults(foodTrucks) {
  foodTrucks.forEach(foodTruck => {
    console.log(foodTruck.applicant + "\t\t" + foodTruck.location);
  });
}
/**
 * Recursive prompt for next set of trucks,
 * @param {Array} foodTrucks array of arrays that contains what will be displayed
 * @param {Number} page pageNumber is currently on to display
 */
function awaitCommand(foodTrucks = [], page = 0) {
  printResults(foodTrucks[page]);
  prompt.start();
  return prompt
    .get({
      name: "Next",
      description: "Enter anything to go to next set of 10 food Trucks:"
    })
    .then(result => result.Next)
    .then(command => {
      return ++page;
    })
    .catch(error => {
      if (error.message === "canceled") {
        system.exit();
      }
      console.log(error.message);
    })
    .then(() => {
      if (page <= foodTrucks.length - 1)
        return awaitCommand(foodTrucks, page++);
      console.log(
        "That is the end of the of the food trucks available right now"
      );
      return;
    });
}

function main() {
  const d = new Date();
  retrieveTruckData(d.getDay()).then(data => {
    const foodTrucks = pipe(
      filterData,
      sortByName,
      splitEvery.bind(null, 10)
    )(data);
    console.log("Name \t\t Address");
    awaitCommand(foodTrucks);
  });
}
main();
