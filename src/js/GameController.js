import GamePlay from "./GamePlay";
import themes from "./themes";
import { generateTeam } from "./generators.js";
import PositionedCharacter from "./PositionedCharacter.js";
import Bowman from "./characters/bowman.js";
import Swordsman from "./characters/swordsman.js";
import Magician from "./characters/magician.js";
import Daemon from "./characters/daemon.js";
import Undead from "./characters/undead.js";
import Vampire from "./characters/vampire.js";
import GameState from './GameState.js';
import heroesDistanceStep from "./HeroesDistance.js";

export default class GameController {
  constructor(gamePlay, stateService) {
    this.gamePlay = gamePlay;
    this.stateService = stateService;
    this.fieldSize = this.gamePlay.boardSize;

    this.onCellEnter = this.onCellEnter.bind(this);
    this.onCellLeave = this.onCellLeave.bind(this);
    this.onCellClick = this.onCellClick.bind(this);
    this.newGame = this.newGame.bind(this);
    this.saveGame = this.saveGame.bind(this);
    this.loadGame = this.loadGame.bind(this);
    this.buttonsAndMethods();
  }

  buttonsAndMethods() {
    this.gamePlay.addCellEnterListener(this.onCellEnter);
    this.gamePlay.addCellLeaveListener(this.onCellLeave);
    this.gamePlay.addCellClickListener(this.onCellClick);

    this.gamePlay.addNewGameListener(this.newGame);
    this.gamePlay.addSaveGameListener(this.saveGame);
    this.gamePlay.addLoadGameListener(this.loadGame);
  }

  init() {
    this.theme = themes.prairie;
    this.level = 1;
    this.gamePlay.drawUi(this.theme);

    this.playerTeam = generateTeam(
      [Bowman, Swordsman, Magician],
      this.level,
      3,
    );
    this.playerPositions = this.generatePositions('playerTeam');
    this.positionedPlayerTeam = this.createPositionedTeam(
      this.playerTeam,
      this.playerPositions,
    );

    this.enemyTeam = generateTeam(
      [Vampire, Undead, Daemon],
      this.level,
      3);
    this.enemyPositions = this.generatePositions('enemyTeam');
    this.positionedEnemyTeam = this.createPositionedTeam(
      this.enemyTeam,
      this.enemyPositions,
    );

    this.allChars = [...this.positionedPlayerTeam, ...this.positionedEnemyTeam];

    this.gamePlay.redrawPositions(this.allChars);
    this.state = {
      isPlayer: true,
      theme: this.theme,
      level: this.level,
      chars: this.allChars,
    };
    console.log(this.state);
    GameState.from(this.state);
    this.winGame = true;
    // console.log(GameState.from(this.state.maxScore));
  }

  // генерация появления персонажей на поле
  generatePositions(string) {
    const positions = [];
    for (let i = 0; i < this.fieldSize; i += 1) {
      for (let j = 0; j < this.fieldSize; j += 1) {
        if (string === 'playerTeam' && j < 2) {
          positions.push(i * this.fieldSize + j);
        }
        if (string === 'enemyTeam' && (j === this.fieldSize - 2 || j === this.fieldSize - 1)) {
          positions.push(i * this.fieldSize + j);
        }
      }
    }
    return positions;
  }

  // eslint-disable-next-line class-methods-use-this
  createPositionedTeam(team, positions) {
    const positionedTeam = [];
    team.characters.forEach((char) => {
      const randomIndex = Math.floor(Math.random() * positions.length);
      const position = parseInt(positions.splice(randomIndex, 1)[0]);
      const positionedCharacter = new PositionedCharacter(char, position);
      positionedTeam.push(positionedCharacter);
    });
    return positionedTeam;
  }

  newGame() {
    this.init();
    console.log("Началась новая игра!");
  }

  saveGame() {
    console.log("Игра сохранена!");
    this.gamePlay.redrawPositions(this.allChars); // Обновляем позиции героев перед сохранением
    const charactersData = this.allChars.map(char => ({
      character: char.character,
      position: char.position
    }));
    this.state = {
      isPlayer: true,
      theme: this.theme,
      level: this.level,
      chars: charactersData.map(data => new PositionedCharacter(data.character, data.position))
    };
    this.gameStateInstance = GameState.from(this.state);
    this.stateService.save(this.gameStateInstance);
    console.log(this.stateService);
  }

  loadGame() {
    this.allChars = [];
    const savedState = this.stateService.load(); // Загружаем сохраненное состояние
    if (savedState) {
      console.log("Игра загружена");
      savedState.chars.forEach(savedChar => {
        const character = this.allChars.find(char => char.position === savedChar.position);
        console.log(character);
        if (character) {
          // Обновляем свойства персонажа из сохраненных данных
          character.level = savedChar.level;
          character.attack = savedChar.attack;
          character.defence = savedChar.defence;
          character.health = savedChar.health;
          // Не обновляем свойства position и type, так как они уже существуют
        } else {
          // Если персонажа с такой позицией нет, добавляем его в список всех персонажей
          this.allChars.push(savedChar);
        }
      });
      this.theme = savedState.theme;
      this.level = savedState.level;
      console.log("Состояние игры успешно восстановлено.");
      // Перерисовываем интерфейс и позиции героев
      this.gamePlay.drawUi(this.theme);
      this.gamePlay.redrawPositions(this.allChars);
    } else {
      console.log("Нет сохраненной игры.");
    }
  }

  displayingCharacteristics(char) {
    return `\u{1F396} ${char.level} \u{2694} ${char.attack} \u{1F6E1} ${char.defence} \u{2764} ${char.health}`
  }

  // проверка, выбраный персонаж является ли персонажем игрока
  checkPlayerType(char) {
    if (!char) {
      return console.log('Character is missing!');
    }

    const playerType = char.character.type;
    return (
      playerType === 'bowman' || playerType === 'swordsman' || playerType === 'magician'
    );
  }

  onCellEnter(index) {
    // TODO: react to mouse enter
    const cellWithChar = this.gamePlay.cells[index].querySelector('.character');
    this.enteredCell = this.gamePlay.cells[index];

    // отображение инфы при наведении на любого героя
    if (cellWithChar) {
      this.enteredChar = this.allChars.find((char) => char.position === index);
      const message = this.displayingCharacteristics(this.enteredChar.character);
      this.gamePlay.showCellTooltip(message, index);
      this.gamePlay.setCursor('pointer');
    }

    // возврат вида курсора в дефолт
    const selectedCell = this.gamePlay.cells[index].classList.contains('selected');

    // установка зелёного кружка (ход выбранного персонажа)
    if (!selectedCell && !cellWithChar) {
      this.gamePlay.setCursor('default');
    }

    // установка зеленого маркера для хода и проверка что туда может походить персонаж
    if (this.clickedChar && !cellWithChar) {
      const stepType = this.clickedChar.character.type;
      if (heroesDistanceStep(
        stepType,
        this.clickedChar.position,
        index,
        this.fieldSize,
        "step",
      )
      ) {
        this.gamePlay.selectCell(index, "green")
        this.gamePlay.setCursor('pointer');
      } else {
        this.gamePlay.setCursor('not-allowed');
      }
    }

    // атака игрока
    if (this.clickedChar && cellWithChar) {
      const attackType = this.clickedChar.character.type;
      const isplayerType = this.checkPlayerType(this.enteredChar);
      if (isplayerType) return;

      if (heroesDistanceStep(
        attackType,
        this.clickedChar.position,
        index,
        this.fieldSize,
        "attack",
      )
      ) {
        this.gamePlay.selectCell(index, "red")
        this.gamePlay.setCursor('crosshair');
      } else {
        this.gamePlay.setCursor('not-allowed');
      }
    }
  }

  onCellLeave(index) {
    // TODO: react to mouse leave
    this.gamePlay.hideCellTooltip(index);

    if (!this.gamePlay.cells[index].classList.contains('selected-yellow')) {
      this.gamePlay.deselectCell(index);
    }
  }

  onCellClick(index) {
    // TODO: react to click
    const cellWithChar = this.gamePlay.cells[index].querySelector('.character');
    this.clickedChar = this.allChars.find((char) => char.position === index);

    // Перемещаем персонажа(если поле зелённое)
    if (this.enteredCell.classList.contains('selected-green')) {
      this.playerStep(index);
      return;
    }

    // атака персонажа
    if (this.enteredCell.classList.contains('selected-red')) {
      this.playerAttack(index);
      return;
    }

    const checkPlayerType = this.checkPlayerType(this.clickedChar);
    // устанавливаем или снимаем желтый круг выделения своего персонажа
    if (cellWithChar && checkPlayerType) {
      this.gamePlay.cells.forEach((cell, i) => this.gamePlay.deselectCell(i));
      this.gamePlay.selectCell(index);
      this.activeChar = this.clickedChar;
      this.activeIndex = index;
    } else {
      GamePlay.showMessage('Вы не выбрали персонажа или делаете недоступный Вам ход');
      this.gamePlay.cells.forEach((cell, i) => this.gamePlay.deselectCell(i));
      this.clickedChar = null;
    }
  }

  levelUp() {
    const levelModules = [
      { theme: themes.prairie, level: 1 },
      { theme: themes.desert, level: 2 },
      { theme: themes.arctic, level: 3 },
      { theme: themes.mountain, level: 4 },
      { theme: null, level: 5}
    ]

    const newLevel = levelModules.find((info) => info.level === this.level + 1);
    this.level = newLevel.level;
    if (this.level < 5) {
      this.theme = newLevel.theme;
    } else {
      this.endGame();
      return
    }

    this.gamePlay.drawUi(this.theme);
    
    for (const hero of this.positionedPlayerTeam) {
      const { health, attack, defence } = hero.character;
      hero.character.health = Math.round(Math.min(health + 80, 100));
      hero.character.attack = Math.round(Math.max(attack, attack * (80 + health) / 100));
      hero.character.defence = Math.round(Math.max(defence, defence * (80 + health) / 100));
      hero.character.level = this.level;
    }
    this.enemyTeam = generateTeam([Vampire, Undead, Daemon], this.level, 3);

    this.playerTeam.characters = this.playerTeam.characters.filter((char) => char.health > 0);
    this.positionedPlayerTeam = this.createPositionedTeam(this.playerTeam, this.playerPositions);
    this.positionedEnemyTeam = this.createPositionedTeam(this.enemyTeam, this.enemyPositions);

    for (const enemy of this.positionedEnemyTeam) {
      if (enemy.character.level === this.level) {
          const { health, attack, defence } = enemy.character;
          enemy.character.health = Math.min(health + 80, 100);
          enemy.character.attack = Math.floor(Math.max(attack, (attack * (80 + health)) / 100));
          enemy.character.defence = Math.floor(Math.max(defence, (defence * (80 + health)) / 100));
      }
    }
    this.allChars = [...this.positionedPlayerTeam, ...this.positionedEnemyTeam];
    this.gamePlay.redrawPositions(this.allChars);
    GameState.from(this.state);
  }

  // логика перемещения персонажа
  playerStep(index) {
    this.activeChar.position = index;
    this.gamePlay.redrawPositions(this.allChars);
    this.gamePlay.cells.forEach((cell, i) => this.gamePlay.deselectCell(i));
    this.clickedChar = null;
    this.state.isPlayer = false;
    this.state.chars = this.allChars;
    GameState.from(this.state);
    this.compAct();
  }

  // логика расчёта урона от атаки
  damageСalculator(attacker, target) {
    const attackerAttack = attacker.character.attack;
    const targetDefence = target.character.defence;
    const damage = Math.max(attackerAttack - targetDefence, attackerAttack * 0.1);
    return Math.floor(damage);
  }

  // атака игрока
  playerAttack(index) {
    const target = this.allChars.find((char) => char.position === index);
    const damage = this.damageСalculator(this.activeChar, target);
    this.gamePlay.showDamage(index, damage)
      .then(() => {
        target.character.health -= damage;
        if (target.character.health <= 0) {
          this.positionedEnemyTeam = this.positionedEnemyTeam.filter((char) => char !== target);
          this.allChars = [...this.positionedPlayerTeam, ...this.positionedEnemyTeam];
          if (this.positionedEnemyTeam.length === 0) {
            // Вызываем метод для перехода на следующий уровень или завершения игры
            this.levelUp();
          }
        }
        this.gamePlay.redrawPositions(this.allChars);
        this.state.chars = this.allChars;
        GameState.from(this.state);
        this.compAct();
      })
  }

  // Ход ИИ. поиск героя игрока для атаки, если такового нет, тогда перемещение.
  compAct() {
    let targetHero = null;
    let targetEnemy = null;
    const playerHeroes = this.positionedPlayerTeam.map((player) => player.position)
    for (const enemy of this.positionedEnemyTeam) {
      for (const hero of playerHeroes) {
        if (heroesDistanceStep(enemy.character.type, enemy.position, hero, this.fieldSize, 'attack')) {
          targetHero = hero;
          targetEnemy = enemy;
          break;
        }
      }
    }
    if (targetEnemy !== null) {
      this.enemyAttack(targetHero, targetEnemy);
    } else {
      this.stepEnemy();
    }
  }

  // атака ботов
  enemyAttack(targetHero, targetEnemy) {
    const targetHeroes = this.allChars.find((char) => char.position === targetHero);
    const damage = this.damageСalculator(targetEnemy, targetHeroes);
    this.gamePlay.showDamage(targetHero, damage)
      .then(() => {
        targetHeroes.character.health -= damage;
        if (targetHeroes.character.health <= 0) {
          this.positionedPlayerTeam = this.positionedPlayerTeam.filter((char) => char !== targetHeroes);
          this.allChars = [...this.positionedPlayerTeam, ...this.positionedEnemyTeam];
        }
        this.gamePlay.redrawPositions(this.allChars);
        this.state.isPlayer = true;
        this.state.chars = this.allChars;
        GameState.from(this.state);
      })
  }

  // передвижение по полю бота
  stepEnemy() {
    if (this.winGame) {
      const randomEnemyIndex = Math.floor(Math.random() * this.positionedEnemyTeam.length);
      const randomEnemy = this.positionedEnemyTeam[randomEnemyIndex];
      const availableCells = [];
      for (let i = 0; i < this.fieldSize * this.fieldSize; i += 1) {
        if (heroesDistanceStep(randomEnemy.character.type, randomEnemy.position, i, this.fieldSize, 'step')) {
          availableCells.push(i);
        }
      }
      const occupiedCells = this.allChars.map((char) => char.position);
      const unoccupiedCells = availableCells.filter((cell) => !occupiedCells.includes(cell));
      const randomCellIndex = Math.floor(Math.random() * unoccupiedCells.length);
      const newPosition = unoccupiedCells[randomCellIndex];
      randomEnemy.position = newPosition;
      this.gamePlay.redrawPositions(this.allChars);
      this.state.chars = this.allChars;
      GameState.from(this.state);
      this.winGame = true;
    }
  }

  endGame() {
    alert("Поздравляю! Вы прошли игру!")
    this.winGame = false;
    // this.maxScore += 1;
    // console.log(GameState.from(this.state.maxScore));
    return
  }
}