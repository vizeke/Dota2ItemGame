
// -----------------------------------------------------------------------
// Globals
// -----------------------------------------------------------------------

var BASE_SCORE_BONUS = 200;
var STREAK_BONUS = 0.15;
var NUM_GUESSES = 3;

var g_TargetItem = null;
var g_ComponentList = null;
var g_Solution = [];
var g_NumPossibleComponents	= 8;
var g_Score = 0;
var g_Streak = 0;
var g_RemainingGuesses = NUM_GUESSES;
var g_tooltipTimeout = 0;
var g_totalQuestions = null;
var g_bSuppressingItemTooltips = false;
var g_LockElements = true;

var g_Items = {
	builtItems: [],
	componentItems: [],
	bLoaded: false,
	data: null
};

var g_ComboNames = [
	'Correto!',
	'Muito bem!',
	'Respostas em massa!',
	'A dominar!',
	'Mega-Resposta!',
	'Imparável!',
	'Respostas Doentias!',
	'Resposta Monstruosa!',
	'Como um Deus!',
	'Para além de um Deus!'
];

var g_RecipeStub = {"img":"recipe_lg.png","dname":"Recipe","qual":"component","desc":"A recipe to build the desired item.","cost":0,"attrib":"","mc":0,"cd":0,"lore":"A recipe is always necessary to craft the most mighty of objects.","components":null,"created":false};

// Load our metadata from the Dota2.com servers
function loadDotaMetadata() {
	// Get our data from Dota2.com
	$.ajax({
		type:'GET',
		cache: true,
		//url:'http://www.dota2.com/jsfeed/itemdata?v=2795637b2795637&l=portuguese',
		url:'resources/itemdata.json',
		dataType:'json',
		success: function( itemJSON ) {
			g_Items.data = itemJSON.itemdata;
			g_Items.bLoaded = true;
			g_Items.data.recipe = g_RecipeStub;
			startupPage();
		},
		failure: function() {
			// alert("Unable to get data from Dota.com!");
		}
	});

	return true;
}

// -----------------------------------------------------------------------
// Determine if the item is valid for use
// -----------------------------------------------------------------------
function isValidItem( key ){
	var excludedItems = new Array(
		"diffusal_blade_2", "aegis","cheese","recipe","courier","flying_courier","tpscroll","ward_observer","ward_sentry","bottle","necronomicon_2",
		"necronomicon_3","dagon_2","dagon_3","dagon_4","dagon_5","halloween_candy_corn","present","mystery_arrow","mystery_hook",
		"mystery_missile","mystery_toss","mystery_vacuum","winter_cake","winter_coco","winter_cookie","winter_greevil_chewy",
		"winter_greevil_garbage","winter_greevil_treat","winter_ham","winter_kringle","winter_mushroom","winter_skates",
		"winter_stocking","winter_band","greevil_whistle","greevil_whistle_toggle","halloween_rapier"
	);

	return ( $.inArray( key, excludedItems ) === -1 );
}

// -----------------------------------------------------------------------
// Separate items into a list of items that are built from base components
// -----------------------------------------------------------------------
function buildRecipeItemsList() {
	if ( !g_Items.bLoaded )
		return false;

	for( var key in g_Items.data ) {
		if ( !g_Items.data.hasOwnProperty( key ) )
			continue;

		var item = g_Items.data[key];
		if ( !isValidItem( key ) )
			continue;

			item.key = key;

		if ( item.hasOwnProperty( 'components') && item['components'] !== null ) {
			g_Items.builtItems.push( item );
		} else {
			g_Items.componentItems.push( item );
		}
	}

	// Keep a list of all the possible items we can ask about
	g_totalQuestions = g_Items.builtItems.slice( 0 );
}

// -----------------------------------------------------------------------
// Pick a random item that's built out of components
// -----------------------------------------------------------------------
function pickRandomItem( itemList ) {
	if ( !g_Items.bLoaded )
		return false;

	var numComponents = itemList.length;
	var randomComponent = Math.floor( Math.random() * numComponents );

	return itemList[randomComponent];
}

// -----------------------------------------------------------------------
// Given an image, return the proper image URI
// -----------------------------------------------------------------------
function imageURIForItem( item ) {
	if ( !item.hasOwnProperty('img') )
		return false;

	return "http://cdn.dota2.com/apps/dota2/images/items/" + item.img;
}

// -----------------------------------------------------------------------
// Tell any parent elements that the user has begun to interact with us
// -----------------------------------------------------------------------
function notifyParentOfInteraction() {
	if ( parent != self ) {
		var jsonData = JSON.stringify({
			"method": "playtab_pause"
		});
		parent.postMessage(
			jsonData,
			"http://www.dota2.com/"
		)
	}
}

// -----------------------------------------------------------------------
// Tell any parent elements that the user has begun to interact with us
// -----------------------------------------------------------------------
function notifyParentOfCompletion() {
	if ( parent != self ) {
		var jsonData = JSON.stringify({
			"method": "playtab_resume"
		});
		parent.postMessage(
			jsonData,
			"http://www.dota2.com/"
		)
	}
}

// -----------------------------------------------------------------------
// Move an element back to the recipe list
// -----------------------------------------------------------------------
function moveItemToIngredients( element ) {
	
	hideItemTooltip();
	g_LockElements = true;
	
	// Find the first open slot in our solution (if any)
	var targetElement = $(element).data("partner");

	// Move the target here
	$(element)
	.animate({
		"top": $(targetElement).position().top,
		"left": $(targetElement).position().left
	}, "fast", function() {
		$(this).remove();
		$(targetElement).removeClass('disabled')
		.unbind( 'mousedown' )
		.on( "mousedown", function() {
			moveItemToSolution( this );
		});
		g_LockElements = false;
	});

	$(element).data("target").removeClass('occupied').addClass('dropTarget');
}

// -----------------------------------------------------------------------
// Move an element from the potential ingredients list to the solution list
// -----------------------------------------------------------------------
function moveItemToSolution( element ) {

	g_LockElements = true;
	hideItemTooltip();

	// Find the first open slot in our solution (if any)
	var targetElement = $('.dropTarget').first();
	if ( targetElement.length === 0 )
		return;

	// Move the target here
	var clone = $(element).clone( true );
	$(clone)
	.css({
		"position": "absolute",
		"top": $(element).position().top,
		"left": $(element).position().left,
		"zIndex": 998
	})
	.animate({
		"top": $(targetElement).position().top,
		"left": $(targetElement).position().left
	}, "fast", function() {
		// Don't allow us to move again until we're done animating
		$(this).on( 'mousedown', function() {
			if ( !g_LockElements ) {
				moveItemToIngredients( $(clone) );
			}
		});
		// Also lock out our partner element until we're ready
		var partner = $(this).data("partner");
		$(partner).on('mousedown', function() {
			if ( !g_LockElements ) {
				moveItemToIngredients( $(clone) );
			}
		});
		scoreGuess();
		g_LockElements = false;
	})
	.unbind("mousedown")
	.data( 'partner', element )
	.data( 'target', targetElement )
	.addClass('guess')
 	.appendTo( $(targetElement) );

	// Mark the destination as being occupied
	$(targetElement).removeClass('dropTarget').addClass('occupied');

	// Disable the old class
	$(element).addClass('disabled').unbind('mousedown');
}

// -----------------------------------------------------------------------
// Turn an element into a draggable source
// -----------------------------------------------------------------------
function makeClickableElement( element ) {

	$(element).addClass( 'dragTarget' );

	// Now, also allow the clicking of an element to create an action
	$(element).on( "mousedown", function() {
		if ( !g_LockElements ) {
			moveItemToSolution( element );
		}
	});
}

// -----------------------------------------------------------------------
// Determine if the item passed is in the supplied list
// -----------------------------------------------------------------------
function itemListContainsItem( item, itemList ) {
	return ( $.inArray( item, itemList ) != -1 );
}

// -----------------------------------------------------------------------
// Show the blackout curtain
// -----------------------------------------------------------------------
function showBlackoutCurtain() {
	$('#blackoutCurtain').css("zIndex", 999).fadeIn( 200 );
}

// -----------------------------------------------------------------------
// Show the blackout curtain
// -----------------------------------------------------------------------
function hideBlackoutCurtain() {
	$('#blackoutCurtain').fadeOut( 800, function() {
		$(this).css("zIndex", -1);
	});
}

// -----------------------------------------------------------------------
// Show a message on the screen for the user
// -----------------------------------------------------------------------
function showAlertMessage( text, callback ) {

	showBlackoutCurtain();

	if ( $('#alertMsg').length === 0 ) {
		$('<div id="alertMsg"></div>').appendTo( '#bodyContent' );
	}

	// Find our midpoint
	var bodyHeight = $('#bodyContent').height();
	var bodyWidth = $('#bodyContent').width();
	var msgHeight = $('#alertMsg').height();
	var msgWidth = $('#alertMsg').width();
	var heightOffset = ( g_Embedded ) ? 35: 10;
	var midY = $('#bodyContent').position().top + ( bodyHeight / 2 ) - ( msgHeight / 2 ) + heightOffset;
	var midX = $('#bodyContent').position().left +  ( bodyWidth / 2 ) - ( msgWidth / 2 );

	// Setup the alert dialog
	$('#alertMsg')
		.html( "<p>"+text+"</p><center><button class='gradientButton'>OK</button></center>" )
		.css({
			"position" : "absolute",
			"opacity" : 0,
			"top" : bodyHeight - (msgHeight*2),
			"left" : midX
		})
		.animate({
			"opacity": 1,
			"top" : midY

		}, 800, "easeOutQuint")
		.find("button")
			.click( function() {
				hideAlertMessage();
				callback()
			});
}

// -----------------------------------------------------------------------
// Hide the global page message
// -----------------------------------------------------------------------
function hideAlertMessage() {

	hideBlackoutCurtain();

	$('#alertMsg')
		.css({
			"opacity": 1
		})
		.animate({
			"opacity": 0,
			"top": "+=" + 50
		}, 400, 'easeInQuint', function() {
			$(this).remove();
		});
}

// -----------------------------------------------------------------------
// Set our score and update our view of it
// -----------------------------------------------------------------------
function setScore( score ) {
	g_Score = score;
	$('#score').text( g_Score );
}

// -----------------------------------------------------------------------
// Add points to our score and update it
// -----------------------------------------------------------------------
function addToScore( points ) {
	g_Score += points;
	setScore( g_Score );
}

// -----------------------------------------------------------------------
// Tell the user they were wrong
// -----------------------------------------------------------------------
function resetScore() {
	setScore( 0 );
	resetStreak();
	setRemainingGuesses( NUM_GUESSES );

	// Reset the question counter
	g_totalQuestions = g_Items.builtItems.slice( 0 );
}

var g_IncorrectText = [
	"Incorreto",
	"Desculpa",
	"Não",
	"Errado",
	"Tenta de novo",
	"Nah",
	"Oops",
	"Falso"
];

// -----------------------------------------------------------------------
// Get the text we show when a guess is incorrect
// -----------------------------------------------------------------------
function getIncorrectText() {
	var randomIndex = Math.floor( Math.random() * g_IncorrectText.length );
	return g_IncorrectText[randomIndex];
}

// -----------------------------------------------------------------------
// Tell the user they were wrong
// -----------------------------------------------------------------------
function notifyIncorrectGuess() {
	// Streak's over!
	resetStreak();
	removeGuess();

	var solutionHeight = $('#recipeItems').height();
	var solutionWidth = $('#recipeItems').width();
	var solutionPosition = $('#recipeItems').position();

	var textElement = $('<div class="popup error"></div>');
	textElement
		.html("<p>"+getIncorrectText()+"</p>")
		.appendTo('#bodyContent')
		.css({
			"width": "100%",
			"opacity": 1,
			"position": "absolute",
			"top": solutionPosition.top + 15,
			"left": 0,
			"zIndex": 99999
		})
		.animate({
			"top": "-=" + 50,
			"opacity": 0
		}, 1750, function() {
			$(this).remove();
		});

	// Give them the "sorry, you lose" screen
	if ( g_RemainingGuesses == 0 ) {
		showSolution();
		setTimeout( notifyParentOfCompletion, 1000 );
		showAlertMessage( "Pontuação Final: " + g_Score, function() {
			resetScore();
			resetPage();
		});
	}

}

// -----------------------------------------------------------------------
// As the number of guesses decreases, change the color accordingly
// -----------------------------------------------------------------------
function getGuessCountClass() {
	if ( g_RemainingGuesses < 2 ) {
		return 'red';
	}
	if ( g_RemainingGuesses < 3 ) {
		return 'yellow';
	}

	return '';
}

// -----------------------------------------------------------------------
// Reset the page state, but keep any scores and setup details
// -----------------------------------------------------------------------
function resetPage() {
	// Nuke our page elements
	$('#recipeItems').empty();
	$('#sourceItems').empty();
	$('.solution').remove();
	$('#recipeItem').empty();

	// Clear the solution
	delete g_ComponentList;
	delete g_Solution;

	// Finish the rest of the layout
	setupPage();
}

// -----------------------------------------------------------------------
// Get the text we should use for this streak
// -----------------------------------------------------------------------
function getStreakText() {
	var maxLines = g_ComboNames.length;
	var streakIndex = g_Streak;
	if ( g_Streak >= g_ComboNames.length ) {
		streakIndex = g_ComboNames.length;
	}

	return g_ComboNames[streakIndex-1];
}

// -----------------------------------------------------------------------
// As the streak rises, the text gets larger and changes color.
// This maps a streak to its representative class.
// -----------------------------------------------------------------------
function getStreakClass() {
	if ( g_Streak < 2 ) {
		return '';
	}
	else if ( g_Streak < 4 ) {
		return 'low';
	}
	else if ( g_Streak < 6 ) {
		return 'medium';
	}
	else if ( g_Streak < 8 ) {
		return 'high';
	}

	return 'insane';
}

// -----------------------------------------------------------------------
// Tell the user they were right!
// -----------------------------------------------------------------------
function notifyCorrectGuess() {
	// Show a "score added" floater
	var bonusPoints = BASE_SCORE_BONUS + Math.round( BASE_SCORE_BONUS * g_Streak * STREAK_BONUS );
	g_Score += bonusPoints;
	$('#score').text( g_Score );
	extendStreak();

	var solutionHeight = $('#recipeItems').height();
	var solutionWidth = $('#recipeItems').width();
	var solutionPosition = $('#recipeItems').position();

	var scoreElement = $('<div class="popup"></div>');
	scoreElement
		.html("<p>"+ getStreakText() +"</p><p>+"+bonusPoints+"</p>")
		.appendTo('#bodyContent')
		.css({
			"width": "100%",
			"opacity": 1,
			"position": "absolute",
			"top": solutionPosition.top,
			"left": 0,
			"zIndex": 99999
		})
		.animate({
			"top": "-=" + 30,
			"opacity": 0
		}, 1000, function() {
			$(this).remove();
			resetPage();
		});
}

// -----------------------------------------------------------------------
// Score the user's guess and react appropriately
// -----------------------------------------------------------------------
function scoreGuess() {
	// Do a basic validation to see if we're even ready to score yet
	var guesses = $('#recipeItems .guess');
	if ( guesses.length == 0 || guesses.length < g_Solution.length )
		return false;

	// Create a scratch solution that we'll move through, removing each item as we go
	var scratchSolution = g_Solution.slice( 0 );

	// Now, compare the guesses to the actual solution items
	for ( var i = 0; i < guesses.length; i++ ) {
		var guess = guesses[i];
		var guessData = $(guess).data("item");
		// If this is the Power Treads item, apply some special rules to allow for multiple item types
		// Quiz Guys says, "I knew you could do this, I just missed the bug!"
		if ( g_TargetItem.key == 'power_treads' ) {
			var multiComponents = new Array( 'robe', 'boots_of_elves' );
			if ( itemListContainsItem( guessData.key, multiComponents ) ) {
				guessData = g_Items.data['belt_of_strength'];
			}
		}

		if ( !itemListContainsItem( guessData, scratchSolution ) ) {
			notifyIncorrectGuess();
			return false;
		}

		// Take it out of the possible solution space
		removeItemFromList( guessData, scratchSolution );
	}

	g_LockElements = true;
	notifyCorrectGuess();
	return true;
}

// -----------------------------------------------------------------------
// Turn an element into a droppable target
// -----------------------------------------------------------------------
function makeDroppableTarget( element ) {
	$(element).addClass( 'dropTarget' );
}

// -----------------------------------------------------------------------
// Show a tooltip on hover
// -----------------------------------------------------------------------
function showItemTooltip( element ) {
	if ( g_bSuppressingItemTooltips )
		return;

	if ( $('#itemTooltip').length === 0 ) {
		// Create the tooltip element
		$('<span id="itemTooltip" class="ui-tooltip-top"></span>').appendTo( $('body') );
	}

	var itemData = $(element).data( "item");
	if ( itemData == null || !itemData.hasOwnProperty('dname') )
		return false;

	var posTop = $(element).offset().top + 38;
	var posLeft = $(element).offset().left;
	var elementWidth = $(element).width();

	// Start by clearing it out
	$('#itemTooltip')
		.empty()
		// .append( $('<div class="tooltipTitle">'+ itemData.dname + '</div>' ) );
		.append( $('<div class="tooltipTitle">'+ itemData.dname + '</div><div class="tooltipAttributes">'+ itemData.attrib + '</div>') )

	var itemWidth = $('#itemTooltip').width();

	$('#itemTooltip')
		.css({
			top: posTop,
			left: posLeft + ( (elementWidth / 2 ) - ( itemWidth / 2 ) ),
			opacity: 0,
			zIndex: 998
		})
		.show()
		.stop()
		.animate({ "opacity": 1.0, "top": posTop+10 }, 100 );
}

// -----------------------------------------------------------------------
// Don't allow tooltips
// -----------------------------------------------------------------------
function suppressItemTooltips() {
	g_bSuppressingItemTooltips = true;
}

// -----------------------------------------------------------------------
// Allow tooltips again
// -----------------------------------------------------------------------
function allowItemTooltips() {
	g_bSuppressingItemTooltips = false;
}

// -----------------------------------------------------------------------
// Hide the tooltip from us
// -----------------------------------------------------------------------
function hideItemTooltip() {
	clearTimeout( g_tooltipTimeout );
	g_tooltipTimeout = 0;

	var tooltipElement = $('#itemTooltip');
	if ( tooltipElement === null )
		return;

	if ( !$(tooltipElement).is(':visible') )
		return;

	var posTop = $(tooltipElement).position().top;
	$(tooltipElement)
		.stop()
		.animate({
			"opacity": 0.0,
			"top": posTop-10
		},
		100, function() {
				$(this).hide()
			});
}

// -----------------------------------------------------------------------
// Build up the components that build to our target item
// -----------------------------------------------------------------------
function buildSolution( targetItem ) {
	if ( targetItem === null || !targetItem.hasOwnProperty( 'components') || targetItem.components === null )
		return false;

	// Clear all elements from any previous solutions
	g_Solution = [];
	var totalCost = 0;

	for ( var i = 0; i < targetItem.components.length; i++ ) {
		var key = targetItem.components[i];
		if ( !g_Items.data.hasOwnProperty(key) )
			return false;

		totalCost += g_Items.data[key].cost;
		g_Solution.push( g_Items.data[key] );
	}

	var recipe = g_Items.data['recipe'];
	if ( totalCost < targetItem.cost ) {
		g_Solution.push( recipe );
	}

	// Never show the recipe's cost
	recipe.cost = '???';
	return true;
}

// -----------------------------------------------------------------------
// Build a list of real and fake components for this item
// -----------------------------------------------------------------------
function buildPossibleComponents( solution ) {
	// Start by adding all the known components
	g_ComponentList = [];
	for ( var i = 0; i < solution.length; i++ ) {
		// Skip the recipe, it's always added elsewhere
		if ( solution[i].dname == "Recipe")
			continue;

		g_ComponentList.push( solution[i] );
	}

	// Find out how many open slots we now have to fill
	var remainingComponents = g_NumPossibleComponents - g_ComponentList.length;
	var possibleComponents = g_Items.componentItems;

	for ( var i = 0; i < remainingComponents; i++ ) {
		var randomItem = pickRandomItem( possibleComponents );
		g_ComponentList.push( randomItem );
	}
}

// -----------------------------------------------------------------------
// Remove an item from an array
// -----------------------------------------------------------------------
function removeItemFromList( item, itemList ) {
	var index = $.inArray( item, itemList );
	if ( index !== -1 ) {
		itemList.splice( index, 1 );
	}
}

// -----------------------------------------------------------------------
// Set the number of guess we have left
// -----------------------------------------------------------------------
function setRemainingGuesses( numGuesses ) {
	g_RemainingGuesses = numGuesses;
	$('#guesses').text( numGuesses );
	$('#guessesText')
		.removeClass()
		.addClass( getGuessCountClass() );
}

// -----------------------------------------------------------------------
// Decrement our guess count
// -----------------------------------------------------------------------
function removeGuess() {
	setRemainingGuesses( g_RemainingGuesses-1 );
}

// -----------------------------------------------------------------------
// Reset our guess count
// -----------------------------------------------------------------------
function resetGuesses() {
	setRemainingGuess( NUM_GUESSES );
}

// -----------------------------------------------------------------------
// Setup our question for this round
// -----------------------------------------------------------------------
function setupPage() {
	// If they've answered all the question, then tell them and reset
	if ( g_totalQuestions.length == 0 ) {
		setTimeout( notifyParentOfCompletion, 1000 );
		showAlertMessage( "Pontuação Final: " + g_Score, function() {
			resetScore();
			resetPage();
		});

		return;
	}

	// Pick a target item to have the user attempt to build
	$('#targetItem .item').each( function() {
		g_TargetItem = pickRandomItem( g_totalQuestions );
		removeItemFromList( g_TargetItem, g_totalQuestions );
		var backgroundImage = "url('" + imageURIForItem( g_TargetItem ) + "') center no-repeat";
		$(this)
			.data( "item", g_TargetItem )
			.css({
				"background": backgroundImage,
				"opacity": 0,
			})
			.stop()
			.animate({
				"opacity": 1,
			}, 800 );
	});

	// Show the number of questions remaining
	$('#remaining').text( g_totalQuestions.length );

	// Build the solution items for the target, including a recipe (if necessary)
	buildSolution( g_TargetItem );

	// Lay out the proper number of components for the item
	for ( var i = 0; i < g_Solution.length; i++ ) {
		var backgroundImage = "url('http://cdn.dota2.com/apps/dota2/images/quiz/item-slot-unknown.png') center no-repeat";
		var element = $('<div class="item noTooltip"></div>');
		$(element)
			.css({
				"background": backgroundImage,
				"opacity": 0
			})
			.appendTo( '#recipeItems')
			.delay( i * 100 )
			.animate({
				"opacity": 1
			}, 800 );

		makeDroppableTarget( $(element) );
	};

	// Build a list of real and false components for our target
	buildPossibleComponents( g_Solution );

	// Lay out the proper number of components for the item
	var numItems = g_ComponentList.length;
	for ( var i = 0; i < numItems; i++ ) {
		var randomItem = pickRandomItem( g_ComponentList );
		var backgroundImage = "url('" + imageURIForItem( randomItem ) + "') center no-repeat";
		var element = $('<div class="item"></div>');
		$(element)
			.css({
				"background": backgroundImage,
				"opacity": 0,
				"height": 0
			})
			.data( "item", randomItem )
			.appendTo( '#sourceItems')
			.delay( i * 50 )
			.animate({
				"opacity": 1,
				"height": 38
			}, 400 );

		makeClickableElement( $(element) );

		// Shrink the amount left
		removeItemFromList( randomItem, g_ComponentList );
	};

	// Always lay out the recipe, otherwise we'll give it away!
	var recipeItem = $('<div></div>');
	var recipeItemData = g_Items.data.recipe;
	var backgroundImage = "url('" + imageURIForItem( recipeItemData ) + "') center no-repeat";
	$(recipeItem)
		.css( "background", backgroundImage )
		.data( "item", recipeItemData );

	makeClickableElement( $(recipeItem) );

	$(recipeItem)
		.addClass("item")
		.appendTo( $('#recipeItem') )
		.css({
			"opacity": 0,
			"height": 0
		})
		.stop()
		.animate({
			"opacity": 1,
			"height": 38
		}, 800 );

	// Update our guess count
	setRemainingGuesses( g_RemainingGuesses );
	
	g_LockElements = false;
}

// -----------------------------------------------------------------------
// Extend our streak bonus
// -----------------------------------------------------------------------
function extendStreak() {
	g_Streak++;
	$('#streak')
		.text( g_Streak );

	$('#streakText')
		.removeClass()
		.addClass( getStreakClass() );
}

// -----------------------------------------------------------------------
// Nuke our streak bonus
// -----------------------------------------------------------------------
function resetStreak() {
	g_Streak = 0;
	$('#streak')
		.text("0");

	$('#streakText')
		.removeClass();
}

// -----------------------------------------------------------------------
// Show our solution if we give up
// -----------------------------------------------------------------------
function showSolution() {

	// resetStreak();
	showBlackoutCurtain();

	var targetElement = $('#recipeItems').children('.item');
	for ( var i = 0; i < g_Solution.length; i++ ) {
		//Place an image in the right place
		var backgroundImage = "url('" + imageURIForItem( g_Solution[i] ) + "') center no-repeat";
		var randomDelay = Math.floor( Math.random() * g_Solution.length ) * 100;
		$('<div class="item solution"></div>')
			.appendTo( '#bodyContent' )
			.css({
				"zIndex": 1000,
				"background": backgroundImage,
				"top": targetElement.position().top,
				"left": targetElement.position().left,
				"position": "absolute",
				"height": 0
			})
			.data( "item", recipeItem )
			.stop()
			.delay(randomDelay)
			.animate({
				"height": 38
			},  800, "easeOutBounce" );

		targetElement = $(targetElement).next('.item');
	}

	// Disable our button
	$('#solutionButton').attr("disabled", "disabled").hide();
	$('#resetButton').hide().fadeIn("fast");
}

// -----------------------------------------------------------------------
// Startup the page after the load has cleared
// -----------------------------------------------------------------------
function startupPage() {
	// Build a structured list of what items are composed of other items
	buildRecipeItemsList();

	// Layout the page properly
	setupPage();

	// Setup tooltip hover
	$('.item').on( "mouseenter", function() {
		if ( $(this).hasClass('noTooltip') )
			return;

		if ( g_bSuppressingItemTooltips )
			return;

		if ( g_tooltipTimeout != 0 )
			return;

		g_tooltipTimeout = setTimeout( function( element ) {
			showItemTooltip( $(element) );
		}, 250, $(this) );
	});

	// Setup tooltip out
	$('.item').on( "mouseleave", function() {
		if ( $(this).hasClass('noTooltip') )
			return;

		hideItemTooltip();
	});

	$('#bodyContent').fadeIn( "fast" );
	$('#spinner').hide();
}

