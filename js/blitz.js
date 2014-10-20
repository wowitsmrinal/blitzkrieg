// Bookkeeping Variables
var logString = "" // All logs are added to this string
var turnlabel = '.turn';
var textfont = "35px Arial";
var gameStopped = false;
var gameover, turn, p1, p2;
var depthLimit = 3; // Specifies what ply level should the AI search upto.
var opMM = 0; var opAB = 1; var opHuman = 2; // enumeration for easy compares
var optimalMove; // Stores move computed by AI
var turntype; // Variable for Paradrop / Blitz string

// Class for Player 1 and 2
function Player(color,colorname,label,scoreholder,algo) {
	this.color = color;
	this.colorname = colorname;
	this.label = label;
	this.scoreholder = scoreholder;
	this.algo = algo;
	this.score = 0;
	this.expNode = 0;
	this.timeMoves = 0;
};

// Board Data and Functions
var boardweights = new Array();
var boardnames = new Array();
var mods = new Array(); // For tracking modifications as one goes deeper into the minimax tree
for (var i = 0; i < depthLimit+1; i++) {
	mods[i] = new Array();
};

function Board(num,name,weights,config) {
	this.num = num;
	this.config = zeros([6,6])
	this.scorePlus = 0;
	this.scoreMinus = 0;
	this.turnCount = 0;
	boardweights[num] = weights;
	boardnames[num] = name;
};

function resetBoard(board) {
	board.config = zeros([6,6]);
	board.scorePlus = 0;
	board.scoreMinus = 0;
	board.turnCount = 0;
};
function sqWeight(board,key) {
	if (key === false) {return false;}
	i = Math.floor(parseInt(key) / 10);
	j = parseInt(key) % 10;
	return boardweights[board.num][i-1][j-1];
};
function sqOwner(board,key){
	if (key === false) {return false;}
	i = Math.floor(parseInt(key) / 10);
	j = parseInt(key) % 10;
	return board.config[i-1][j-1];
};
function setSqOwner(board,key,ownercolor){
	i = Math.floor(parseInt(key) / 10);
	j = parseInt(key) % 10;
	board.config[i-1][j-1] = ownercolor;
};
function clearSq(board,fieldId,real) {
	setSqOwner(board,fieldId,0);
	if(real) {clearGridSq(fieldId);}
};
function markSq(board,fieldId,p,real) {		
	setSqOwner(board,fieldId,p.color);
	if(real) {markGridSq(fieldId,p);}
};
function updateBoard(board,fieldId,real,turn,depth) {
	turntype = "Paradrop";
	board.scorePlus = 0;
	board.scoreMinus = 0;
	if (gameover || sqOwner(board,fieldId) != 0) {
		return false;
	}
	board.turnCount += 1;
	board.scorePlus += sqWeight(board,fieldId);
	markSq(board,fieldId,p(turn),real);

	if (depth!=undefined) {mods[depth].length = 0;}
	if (hasNeigh(board,fieldId,p(turn))) {
		turntype = "Blitz";
		captureNeigh(board,fieldId,turn,real,depth);
	}

	if (real) {
		p(turn).score += board.scorePlus;
		p(!turn).score -= board.scoreMinus;
		var location = String.fromCharCode(Math.floor(parseInt(fieldId) / 10) + 65) + (parseInt(fieldId) % 10).toString();
		logit(location + " " + p(turn).colorname + " " + turntype);
	}
	return true;
};

function unupdateBoard(board,fieldId,turn,depth) {
	board.turnCount -= 1;
	clearSq(board,fieldId,false);
	for (var i = 0; i < mods[depth].length; i++) {
		clearSq(board,mods[depth][i],false);
		markSq(board,mods[depth][i],p(!turn),false);
	};
	board.scorePlus = 0;
	board.scoreMinus = 0;
}

function hasNeigh(board,fieldId, p) {
	if (sqOwner(board,leftStr(fieldId)) === p.color || 
		sqOwner(board,bottomStr(fieldId)) === p.color ||
		sqOwner(board,topStr(fieldId)) === p.color ||
		sqOwner(board,rightStr(fieldId)) === p.color) {return true;}
		return false;
};

function captureNeigh(board,fieldId,turn,real,depth) {
	captureCell(board,turn,leftStr(fieldId),real,depth);
	captureCell(board,turn,rightStr(fieldId),real,depth);
	captureCell(board,turn,topStr(fieldId),real,depth);
	captureCell(board,turn,bottomStr(fieldId),real,depth);
};

function captureCell(board,turn,cell,real,depth) {
	if (cell === false || sqOwner(board,cell) != p(!turn).color) {
		return;
	}
	else {
		if (sqOwner(board,cell) === p(!turn).color) {
			board.scoreMinus += sqWeight(board,cell);
		}
		board.scorePlus += sqWeight(board,cell);
		clearSq(board,cell,real);
		markSq(board,cell,p(turn),real);
		if (depth!=undefined) {mods[depth].push(cell);}
	}
};

// AI - Minimax Algorithm

function Minimax(board,depth,maximizingPlayer,pscore,oppscore,turn) {
	if (depth === 0 || board.turnCount === 36) {
		if (depthLimit%2 === 0) {
			if (turn) {
				p1.expNode += 1;
			}
			else {
				p2.expNode += 1;
			}
		}
		else {
			if (!turn) {
				p1.expNode += 1;
			}
			else {
				p2.expNode += 1;
			}
		}
		return (pscore - oppscore);
	}
	var bestValue = maximizingPlayer ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
	for (var i = 1; i <= 6; i++) {
		for (var j = 1; j <= 6; j++) {
			if (board.config[i-1][j-1] === 0) {;
				updateBoard(board,(i*10+j).toString(),false,turn,depth);
				var pscorenew = maximizingPlayer ? pscore+board.scorePlus : pscore-board.scoreMinus;
				var oppscorenew = !maximizingPlayer ? oppscore+board.scorePlus : oppscore-board.scoreMinus;
				var val = Minimax(board,depth-1,!maximizingPlayer,pscorenew,oppscorenew,!turn);
				bestValue = maximizingPlayer ? Math.max(bestValue,val) : Math.min(bestValue,val);
				if (depth === depthLimit && bestValue === val) {
					optimalMove = (i*10+j).toString();
				}
				unupdateBoard(board,(i*10+j).toString(),turn,depth);
			}
		};
	};
	return bestValue;
};

// AI - Minimax Algorithm with Alpha-Beta Pruning

function AlphaBeta(board,depth,maximizingPlayer,pscore,oppscore,turn,alpha,beta) {
	if (depth === 0 || board.turnCount === 36) {
		if (depthLimit%2 === 0) {
			if (turn) {
				p1.expNode += 1;
			}
			else {
				p2.expNode += 1;
			}
		}
		else {
			if (!turn) {
				p1.expNode += 1;
			}
			else {
				p2.expNode += 1;
			}
		}
		return (pscore - oppscore);
	}
	var i,j;
	if (maximizingPlayer){
		dance1:
		for (i = 1; i <= 6; i++) {
			for (j = 1; j <= 6; j++) {
				if (board.config[i-1][j-1] === 0) {
					updateBoard(board,(i*10+j).toString(),false,turn,depth);
					var pscorenew = maximizingPlayer ? pscore+board.scorePlus : pscore-board.scoreMinus;
					var oppscorenew = !maximizingPlayer ? oppscore+board.scorePlus : oppscore-board.scoreMinus;
					var val = AlphaBeta(board,depth-1,!maximizingPlayer,pscorenew,oppscorenew,!turn,alpha,beta);
					if (val > alpha){
						alpha = val;
						if (depth === depthLimit) {
							optimalMove = (i*10+j).toString();
						}
					}
					unupdateBoard(board,(i*10+j).toString(),turn,depth);
					if (beta <= alpha) {break dance1;}
				}
			};
		};
		return alpha;
	}
	else
	{
		dance2:
		for (i = 1; i <= 6; i++) {
			for (j = 1; j <= 6; j++) {
				if (board.config[i-1][j-1] === 0) {
					updateBoard(board,(i*10+j).toString(),false,turn,depth);
					var pscorenew = maximizingPlayer ? pscore+board.scorePlus : pscore-board.scoreMinus;
					var oppscorenew = !maximizingPlayer ? oppscore+board.scorePlus : oppscore-board.scoreMinus;
					var val = AlphaBeta(board,depth-1,!maximizingPlayer,pscorenew,oppscorenew,!turn,alpha,beta);
					if (val < beta) {
						beta = val;
						if (depth === depthLimit) {
							optimalMove = (i*10+j).toString();
						}
					}
					unupdateBoard(board,(i*10+j).toString(),turn,depth);
					if (beta <= alpha) {break dance2;}
				}
			};
		};
		return beta;
	}

};

var boards = new Array();
boards[0] = new Board(0,'Keren',
	[[1,1,1,1,1,1],
	[1,1,1,1,1,1],
	[1,1,1,1,1,1],
	[1,1,1,1,1,1],
	[1,1,1,1,1,1],
	[1,1,1,1,1,1]]);
boards[1] = new Board(1,'Narvik',
	[[99,1,99,1,99,1],
	[1,99,1,99,1,99],
	[99,1,99,1,99,1],
	[1,99,1,99,1,99],
	[99,1,99,1,99,1],
	[1,99,1,99,1,99]]);
boards[2] = new Board(2,'Sevastopol',
	[[1,1,1,1,1,1],
	[2,2,2,2,2,2],
	[4,4,4,4,4,4],
	[8,8,8,8,8,8],
	[16,16,16,16,16,16],
	[32,32,32,32,32,32]]);
boards[3] = new Board(3,'Smolensk',
	[[66,76,28,66,11,9],
	[31,39,50,8,33,14],
	[80,76,39,59,2,48],
	[50,73,43,3,13,3],
	[99,45,72,87,49,4],
	[80,63,92,28,61,53]]);
boards[4] = new Board(4,'Westerplatte',
	[[1,1,1,1,1,1],
	[1,3,4,4,3,1],
	[1,4,2,2,4,1],
	[1,4,2,2,4,1],
	[1,3,4,4,3,1],
	[1,1,1,1,1,1]]);
var gameBoard = boards[3];

// Helper Functions 

function p(turn) {
	if (turn === true) {
		return p1;
	}
	else {
		return p2;
	}
}

function leftStr(fieldId) {
	if (fieldId.charAt(1) === '1') {return false;}
	else {return (parseInt(fieldId)-1).toString();}
};
function rightStr(fieldId) {
	if (fieldId.charAt(1) === '6') {return false;}
	else {return (parseInt(fieldId)+1).toString();}
};
function topStr(fieldId) {
	if (fieldId.charAt(0) === '1') {return false;}
	else {return (parseInt(fieldId)-10).toString();}
};
function bottomStr(fieldId) {
	if (fieldId.charAt(0) === '6') {return false;}
	else {return (parseInt(fieldId)+10).toString();}
};

function algotext(num) {
	switch(num) {
		case 1 : return "Minimax";
		case 2 : return "Alpha-Beta Pruning"
		case 3 : return "Human"
	};
}

function zeros(dimensions) {
	var array = [];
	for (var i = 0; i < dimensions[0]; ++i) {
		array.push(dimensions.length == 1 ? 0 : zeros(dimensions.slice(1)));
	}
	return array;
};

function nwc(x) {
	return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function nwcrounded(x) {
	var y = Math.round(x * 100) / 100
	return y.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Grid Update Functions

function populateGrid(board) {
	for (var i = 1; i <= 6; i++) {
		for (var j = 1; j <= 6; j++) {
			var id = (i*10+j).toString();
			var canvas = document.getElementById(id);
			var context = canvas.getContext("2d");
			context.clearRect(0,0,canvas.width,canvas.height);
			context.textAlign="center"; 
			context.textBaseline = 'middle';
			context.font = textfont;
			context.fillText(boardweights[board.num][i-1][j-1],canvas.width/2,canvas.height/2);
		};
	};
};

function clearGrid() {
	for (var i = 1; i <= 6; i++) {
		for (var j = 1; j <= 6; j++) {
			var id = (i*10+j).toString();
			clearGridSq(id);
		};
	};
};

function switchTurn() {
	turn = !turn;
	$(turnlabel).text(p(turn).colorname + "'s turn");    
	if (p(turn) === p1) {
		clearTurnlabel();
		markTurnlabel(p1);
	}
	else {
		clearTurnlabel();
		markTurnlabel(p2);
	}
	$(p1.scoreholder).text(p1.score.toString());
	$(p2.scoreholder).text(p2.score.toString());
};

function resetGame(disablebtn,stopped) {
	logclear();
	if(typeof(disablebtn)==='undefined') disablebtn = true;
	if(typeof(stopped)==='undefined') stopped = false;
	p1 = new Player(1,'Blue','label-primary','.b-score',parseInt($(".bluelabel.active").attr('value')));
	p2 = new Player(2,'Green','label-success','.g-score',parseInt($(".greenlabel.active").attr('value')));
	for (var i = 0; i < boards.length; i++) {
		resetBoard(boards[i]);
	};
	clearGrid();
	gameover = false;
	turn = false;
	switchTurn();
	gameBoard.turnCount = 0;
	if (disablebtn) {
		$('.dis').addClass('disabled');
		$('.active').removeClass('disabled');
		$(turnlabel).removeClass('label-danger');
	}
	if (stopped) {
		$(turnlabel).addClass('label-danger');
		$(turnlabel).text('Game Stopped');
	}

	logit("Blue is " + algotext(p1.algo+1));
	logit("Green is " + algotext(p2.algo+1));
	logit("Board is " + boardnames[gameBoard.num]);
	logit("");
};

function clearTurnlabel() {
	$(turnlabel).removeClass(p1.label);
	$(turnlabel).removeClass(p2.label);
};

function markTurnlabel(p) {
	$(turnlabel).addClass(p.label);
	$(turnlabel).text(p.colorname + "'s Turn");
};

function clearGridSq(fieldId) {
	$('#'+fieldId).removeClass(p1.colorname);
	$('#'+fieldId).removeClass(p2.colorname);
};

function markGridSq(fieldId,p) {
	$('#'+fieldId).addClass(p.colorname);
};

function handleGameOver() {
	if (gameBoard.turnCount == 36) {
		gameover = true;
		clearTurnlabel();

		logit(" ");
		if (p1.algo != opHuman) {
			logit(p1.colorname + " scored " + nwc(p1.score) + " expanding " + nwc(p1.expNode) + " nodes at about " + nwcrounded(p1.timeMoves/18.0) + " ms per move.");
		}
		else {
			logit(p1.colorname + " scored " + nwc(p1.score) + ".");
		}
		if (p2.algo != opHuman) {
			logit(p2.colorname + " scored " + nwc(p2.score) + " expanding " + nwc(p2.expNode) + " nodes at about " + nwcrounded(p2.timeMoves/18.0) + " ms per move.");
		}
		else {
			logit(p2.colorname + " scored " + nwc(p2.score) + ".");
		}
		logit(" ");

		if (p1.score > p2.score) {
			markTurnlabel(p1);
			$(turnlabel).text(p1.colorname + " Wins");
			logit(p1.colorname + " Wins ");
		}
		else if (p1.score < p2.score) {
			markTurnlabel(p2);
			$(turnlabel).text(p2.colorname + " Wins");
			logit(p2.colorname + " Wins ");
		}
		else {
			$(turnlabel).addClass('label-danger');
			$(turnlabel).text("Game Drawn");
			logit("Game Drawn");
		}

		gameStopped = true;
		$('.dis').removeClass('disabled');
		$('#play-game').text('Play New Game');
	}
}

// Logging functions
function logit(str) {
	logString += str + "<br />";
	$('#logmodal').html(logString);
}

function logclear() {
	logString = "";
	$('#logmodal').text(logString);
}

// Event Handlers

$(document).ready(function() {
	$('.btn').button();
	resetGame();
	populateGrid(gameBoard);

	$('#play-game').click(function(e) {
		if (gameStopped === false) {
			gameStopped = true;
			resetGame();
			$('.dis').removeClass('disabled');
			$('#play-game').text('Play Game');
			clearTurnlabel();
			$(turnlabel).addClass('label-danger');
			$(turnlabel).text('Game Stopped');
		}
		else
		{
			gameStopped = false;
			$('#play-game').text('Stop Game');
			resetGame();
			populateGrid(gameBoard);
			autoMoveFn();
		}
	});

	$('canvas').hover(
		function(e) {
			if (gameStopped) {return;}
			var field = $(this);

			field.animate({ opacity: 1.0 }, 25);
		},
		function(e) {
			if (gameStopped) {return;}
			var field = $(this);

			field.animate({ opacity: 0.75 }, 25);
		});

	$('canvas.field').click(function() {
		if (gameStopped || p(turn).algo != opHuman) {return;}
		var fieldId = $(this).attr('id');
		if (!updateBoard(gameBoard,fieldId,true,turn)) {return;}
		switchTurn();
		handleGameOver();
		autoMoveFn();
	});
});

function autoMoveFn() {
	if (gameStopped || p(turn).algo === opHuman) {return;}
	var start = new Date().getTime();
	if (p(turn).algo === opMM) {
		Minimax(gameBoard,depthLimit,true,p(turn).score,p(!turn).score,turn);
	}
	else {
		AlphaBeta(gameBoard,depthLimit,true,p(turn).score,p(!turn).score,turn,Number.NEGATIVE_INFINITY,Number.POSITIVE_INFINITY);
	}
	var end = new Date().getTime();
	p(turn).timeMoves += end-start;
	updateBoard(gameBoard,optimalMove,true,turn);
	switchTurn();
	handleGameOver();
	autoMoveFn();
}

$('.step').click(function() {
	$(this).blur();
});

$( document.body ).on( 'click', '.dropdown-menu li', function( event ) {

	var $target = $( event.currentTarget );
	for (var i = 0; i < boards.length; i++) {
		if ($target.text() === boardnames[i]) {
			gameBoard = boards[i];
			resetGame(false,true);
			populateGrid(gameBoard);
			break;
		}
	};

	$target.closest( '.btn-group' )
	.find( '[data-bind="gboardtext"]' ).text('Board -- ' + $target.text() +' ' )
	.end()
	.children( '.dropdown-toggle' ).dropdown( 'toggle' );
	return false;
});