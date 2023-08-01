// ==UserScript==
// @name         Ayaya BP Overlay
// @namespace    http://tampermonkey.net/
// @version      2
// @description  Donnes des stats sur joueur de la partie
// @author       Ayaya
// @match        https://jklm.fun/*
// @match        https://*.jklm.fun/games/bombparty/
// @match        https://jklm.macadelic.me/*
// @match        https://*.jklm.macadelic.me/games/bombparty/
// @match        http://jklm.macadelic.me/*
// @match        http://*.jklm.macadelic.me/games/bombparty/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=jklm.fun
// @grant        none
// ==/UserScript==

let playersList = []
let selectedPlayer = null
let isShowBL = true
let statsContainer

class Player {
	constructor(peerId = null, nickname = null, language = null, roles = null){
		this.peerId = peerId;
        this.nickname = nickname;
        this.language = language;
        this.roles = roles;
		this.bonusLetters = [];

        this.word = "";

		this.isReactionTime = false;
        this.reactionsTimes = [];
        this.startReactionTime = 0.0;
        this.endReactionTime = 0.0;

		this.wpmWords = [];
        this.wpmTimes = [];
        this.wpms = [];
        this.startWpmTime = 0.0;
        this.endWpmTime = 0.0;

		this.isErased = false;
        this.numberOfErrorTyped = 0;
        this.errorsPercentage = [];

        this.lastWpmAverage = null;
        this.lastReactionTimeAverage = null;
        this.lastErrorPercentage = null;

        this.totalCorrectWord = 0;
	}

	updateGeneralInfo(jsonData) {
        this.auth(jsonData[2].auth)
        this.language(jsonData[2].language)
        this.nickname(jsonData[2].nickname)
        this.peerId(jsonData[2].peerId)
        this.roles(jsonData[2].roles)
    }

	updateGameInfo() {
        this.reactionsTimes = []
        this.wpmTimes = []
        this.wpmWords = []
        this.wpms = []
        this.isReactionTime = true
        this.startReactionTime = performance.now();
        this.isErased = false
        this.numberOfErrorTyped = 0
        this.word = ""
        this.errorsPercentage = []
        this.wasWordValidated = null
    }

	getReactionTimeAverage() {
        let newReactionsTimes = parseFloat(0.0)
        for (const reactionTime of this.reactionsTimes) {
            newReactionsTimes = parseFloat(newReactionsTimes) + parseFloat(reactionTime)
        }
        var average = newReactionsTimes / this.reactionsTimes.length
        return average.toFixed(0)
    }

    getWpmAverage() {
        let totalTimeWpm = parseFloat(0.0)
        let totalWords = 0
        for (const wpmTime of this.wpmTimes) {
            totalTimeWpm = parseFloat(totalTimeWpm) + parseFloat(wpmTime)
        }
        for (const wordLength of this.wpmWords) {
            totalWords += wordLength
        }
        var average = (totalWords * 60000) / totalTimeWpm
        return average.toFixed(0)
    }

    getPrecisionAverage() {
        let totalPrecision = parseFloat(0.0)
        for (const errorPercentage of this.errorsPercentage) {
            totalPrecision = parseFloat(totalPrecision) + parseFloat(errorPercentage)
        }
        var average = (totalPrecision / this.errorsPercentage.length) * 100
        return average.toFixed(2)
    }

}

function addPlayer(json){
    playersList.push(new Player(json.profile.peerId,json.profile.nickname,json.profile.language,json.profile.roles))

}

function findPlayerByPeerId(playerPeerId) {
  const player = playersList.find(player => player.peerId === playerPeerId);
  return player || null;
}

function removeDuplicatesByPeerId(players) {
  const uniqueIds = new Set();
  const filteredList = players.filter(player => {
    if (!uniqueIds.has(player.peerId)) {
      uniqueIds.add(player.peerId);
      return true;
    }
    return false;
  });

  return filteredList;
}

function removePlayer(peerIdToRemove){
    const indexToRemove = playersList.findIndex(player => player.peerId === peerIdToRemove);
    if (indexToRemove !== -1) {
        playersList.splice(indexToRemove, 1);
    }
}

function updatePlayerList(playersInformations){
    const allowedIds = Object.keys(playersInformations);
    playersList = playersList.filter(player => allowedIds.includes(player.peerId.toString()));
    playersList = removeDuplicatesByPeerId(playersList)

}


function createOverlay() {

    const existingTable = statsContainer.querySelectorAll("table");
    if (existingTable) {
        existingTable.forEach(table => {
            table.remove();
        });
    }

    const playerTable = document.createElement("table");
    playerTable.style.borderSpacing = "12px";

    const headerRow = document.createElement("tr");
    const columnHeaders = ["Player", "Wpm", "Reaction", "Accuracy"];

    columnHeaders.forEach(headerText => {
        const headerColumn = document.createElement("th");
        headerColumn.textContent = headerText;
        headerColumn.style.fontSize = "13px";
        headerColumn.style.fontWeight = "bold";
        headerColumn.style.textAlign = "left";
        headerColumn.style.color = "white";
        headerRow.appendChild(headerColumn);
    });

    playerTable.appendChild(headerRow);

    playersList.forEach(player => {
        const newPlayerRow = document.createElement("tr");

        const createPlayerCell = (content) => {
            const playerCell = document.createElement("td");
            playerCell.textContent = content;
            playerCell.style.fontSize = "12px";
            playerCell.style.textAlign = "left";
            if (player === selectedPlayer) {
                if (isShowBL) {
                    playerCell.style.color = "lightgray";
                } else {
                    playerCell.style.color = "gray";
                }
            } else {
                playerCell.style.color = "gray";
            }
            return playerCell;
        };

        newPlayerRow.appendChild(createPlayerCell(player.nickname));
        newPlayerRow.appendChild(createPlayerCell(player.getWpmAverage()));
        newPlayerRow.appendChild(createPlayerCell(player.getReactionTimeAverage() + "ms"));
        newPlayerRow.appendChild(createPlayerCell(player.getPrecisionAverage() + "%"));

        playerTable.appendChild(newPlayerRow);
    });


    if (isShowBL){
        const lignes = playerTable.getElementsByTagName('tr');
        for (let i = 0; i < lignes.length; i++) {
            lignes[i].addEventListener('click', function() {
                selectedPlayer = playersList[i-1]
                createOverlay(statsContainer)
            });

            lignes[i].style.cursor = "pointer";
        }

        const bonusLettersTable = document.createElement("table");
        bonusLettersTable.style.paddingLeft = "12px";
        bonusLettersTable.style.borderSpacing = "0px";

        const headerRowBL = document.createElement("tr");
        const columnHeadersBL = ["Letters"];

        columnHeadersBL.forEach(headerText => {
            const headerColumn = document.createElement("th");
            headerColumn.textContent = headerText;
            headerColumn.style.fontSize = "13px";
            headerColumn.style.fontWeight = "bold";
            headerColumn.setAttribute("colspan", "2");
            headerColumn.style.textAlign = "left";
            headerColumn.style.color = "white";
            headerColumn.style.paddingTop  = "2px";
            headerColumn.style.paddingBottom  = "4px";
            headerRowBL.appendChild(headerColumn);
        });

        bonusLettersTable.appendChild(headerRowBL);

        const keys = Object.keys(selectedPlayer.bonusLetters);

        for (const key of keys) {
            let valeur = selectedPlayer.bonusLetters[key]
            if (valeur > 0){

                const newBonnusLettersRow = document.createElement("tr");

                const createBonusLettersCell = (content) => {
                    const bonusLettersCell = document.createElement("td");
                    bonusLettersCell.textContent = content;
                    bonusLettersCell.style.fontSize = "14px";
                    bonusLettersCell.style.textAlign = "left";
                    bonusLettersCell.style.color = "#999";
                    return bonusLettersCell;
                };

                newBonnusLettersRow.appendChild(createBonusLettersCell(key.toUpperCase()));
                newBonnusLettersRow.appendChild(createBonusLettersCell(valeur));
                bonusLettersTable.appendChild(newBonnusLettersRow);
            }

        }

        statsContainer.appendChild(playerTable);
        statsContainer.appendChild(bonusLettersTable);
    }
    else{
        statsContainer.appendChild(playerTable);
    }

}

document.addEventListener('keydown', (event) => {
  if (event.key === 'F2') {
    isShowBL = !isShowBL;
    createOverlay(statsContainer)
  }
});

window.addEventListener("load", function() {
    if (window.top !== window.self) {
        const middleContainer = document.querySelector("body > div.main.page > div.middle");
        statsContainer = document.createElement("div");
        statsContainer.style = "position: absolute;top: 20px;left: 25px;";
        statsContainer.id = "statsContainer"
        middleContainer.appendChild(statsContainer);


        let selfPeerId = null

        /* GAME SOCKET GENERAL */
        socket.on("setup", (setup) =>{
			for (const player of setup.players) {
				playersList.push(new Player(player.profile.peerId,player.profile.nickname,player.profile.language,player.profile.roles));
			}
			 if (setup.milestone.name == "round") {
					playersList.forEach(player => {
                        player.updateGameInfo();
                        const bonusLettersObj = setup.milestone.playerStatesByPeerId[player.peerId];
                        if (bonusLettersObj && bonusLettersObj.bonusLetters) {
                            player.bonusLetters = bonusLettersObj.bonusLetters;
                        }
                    });
                 selectedPlayer = playersList[0]
                 createOverlay()
			 }

        })

        socket.on("setMilestone", (milestone) => {
            if (milestone.name == "round") {
                updatePlayerList(milestone.playerStatesByPeerId)
                playersList.forEach(player => {
                    player.updateGameInfo();
                    const bonusLettersObj = milestone.playerStatesByPeerId[player.peerId];
                    if (bonusLettersObj && bonusLettersObj.bonusLetters) {
                        player.bonusLetters = bonusLettersObj.bonusLetters;
                    }
                });
                selectedPlayer = playersList[0]
                createOverlay()
            }
        });

		socket.on("nextTurn", (playerPeerId, syllable, turnWithSameSyllable) => {
            let currentPlayer = findPlayerByPeerId(playerPeerId)

            //Reaction time
            currentPlayer.isReactionTime = true
            currentPlayer.startReactionTime = performance.now();

            //Precision
            currentPlayer.isErased = false
            currentPlayer.numberOfErrorTyped = 0
            currentPlayer.word = ""

            createOverlay()
        });

        /* GAME SOCKET PLAYER */

        socket.on("addPlayer", (playerInformations) => {
            addPlayer(playerInformations);
        });

        socket.on("correctWord", ({ playerPeerId, bonusLetters }) => {
            let currentPlayer = findPlayerByPeerId(playerPeerId)
            var correctWord = currentPlayer.word.replace(/[^a-zA-Z-']/gi, '')

            //Bonus Letters
            currentPlayer.bonusLetters = bonusLetters

            //Reaction time
            currentPlayer.isReactionTime = false

            //Calculate WPM
            currentPlayer.endWpmTime = performance.now()
            let duration = (currentPlayer.endWpmTime - currentPlayer.startWpmTime).toFixed(3);

            var counter = 1
            var strVide = ""
            for (var i = 0; i < correctWord.length; i++) {
                strVide += correctWord.charAt(i)
                if (strVide.length % 7 === 0) { counter++ }
            }

            currentPlayer.wpmWords.push(counter)
            currentPlayer.wpmTimes.push(duration)

            //Precision
            if (currentPlayer.numberOfErrorTyped == 0) {
            currentPlayer.errorsPercentage.push(1)
            }
            else {
                var lengthWordError = currentPlayer.word.length - currentPlayer.numberOfErrorTyped
                var lengthWord = currentPlayer.word.length
                var errorPercentage = lengthWordError / lengthWord
                currentPlayer.errorsPercentage.push(errorPercentage)
            }

        });

		socket.on("failWord", (playerPeerId, reason) => {
            let currentPlayer = findPlayerByPeerId(playerPeerId)

            currentPlayer.wasWordValidated = false

            //Precision
            switch (reason) {
                case "mustContainSyllable":
                    break
                case "alreadyUsed":
                    currentPlayer.errorsPercentage.push(0.0)
                    break
                case "notInDictionary":
                    currentPlayer.errorsPercentage.push(0.0)
                    break
            }
        });

		socket.on("livesLost", (playerPeerId, newPlayerLives) => {
            let currentPlayer = findPlayerByPeerId(playerPeerId)

            //Reaction time
            currentPlayer.isReactionTime = false //Stop reaction time

            //Precision
            currentPlayer.errorsPercentage.push(0) //Add new error percentage
        });

        socket.on("removePlayer", (playerPeerId) => {
            removePlayer(playerPeerId);
        });

		socket.on("setPlayerWord", (playerPeerId, word, isSend) => {
            let currentPlayer = findPlayerByPeerId(playerPeerId)

            //Precision
            if (!isSend) {
                if (word.length > currentPlayer.word.length) {
                    if (currentPlayer.isErased) { currentPlayer.isErased = false }
                }
                else if (word.length < currentPlayer.word.length) {
                    if (!currentPlayer.isErased) {
                        currentPlayer.isErased = true
                        currentPlayer.numberOfErrorTyped++
                    }
                }
            }

            //Start WPM
            if (word.length == 1) {
                currentPlayer.startWpmTime = performance.now()
                //Reaction time
                if (currentPlayer.isReactionTime == true) {
                    currentPlayer.endReactionTime = performance.now();
                    let duration = (currentPlayer.endReactionTime - currentPlayer.startReactionTime).toFixed(3);
                    currentPlayer.reactionsTimes.push(duration)
                    currentPlayer.isReactionTime = false
                }
            }

            currentPlayer.word = word

        });

        console.log("Overlay d'Ayaya injecté")
    }
});

