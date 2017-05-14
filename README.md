# immutable-minimongo

Modified Meteor's minimongo package to store the documents and live query results as immutable objects.

The fetched results as well as documents returned from live queries by callbacks are immutable.

This approach allows more efficient implementation:

- many cases of deep cloning could be eliminated

- faster deep equality comparisons

- easier intergation with redux

The package passes all the units tests, that were slightly modified to refrlect the new nature of returned document.

The legacy adapter is also provided that converts all resulting document to standard JS objects and
thus behaves almost 100% the same as original minimongo. 
