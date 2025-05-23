import Phaser from 'phaser';
import { Player } from '../objects/Player';
import { Monster } from '../objects/Monster';

// 定义并导出角色属性接口
export interface CharacterStats {
    gender: string;
    hp: number;
    mp: number;
    atk: number;
    def: number;
    agi: number;
    luc: number;
    level: number;
}

// 定义并导出怪物属性接口
export interface MonsterStats {
    hp: number;
    atk: number;
    def: number;
}

// 定义道路类型
interface RoadTile {
    x: number;
    y: number;
    type: 'horizontal' | 'vertical' | 'corner' | 'cross';
    sprite?: Phaser.GameObjects.Image;
}

// 定义道路布局类型
interface RoadLayout {
    x: number;
    y: number;
    type: 'horizontal' | 'vertical' | 'corner' | 'cross';
    length?: number;
}

class GameScene extends Phaser.Scene {
    private player!: Player;
    private monster!: Monster;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private speed: number = 200;
    private attackAnimationKey: string = 'player_attack_anim';
    private isColliding: boolean = false;
    private lastDirection: string | null = null;
    private monsterMoveTimer!: Phaser.Time.TimerEvent;
    private roadTiles: RoadTile[] = [];
    private tileSize: number = 96; // 修改为 96 像素，以适应玩家大小
    private isMoving: boolean = false; // 添加移动状态属性
    private monsterPathEnd: { x: number; y: number } | null = null;
    private monsterLastPositions: { x: number; y: number }[] = []; // 添加位置记忆数组
    private readonly MAX_POSITION_MEMORY = 5; // 记住最近5个位置

    constructor() {
        super('GameScene');
        console.log('GameScene constructor');
    }

    create(): void {
        // 创建道路系统
        this.createRoadSystem();

        this.player = new Player(
            this,
            this.tileSize * 2.5, // 调整初始 X 位置到道路中心
            this.tileSize * 2.5, // 调整初始 Y 位置到道路中心
            'player',
            'player_attack',
            this.attackAnimationKey
        );

        // 确保玩家初始位置在道路上
        this.adjustPlayerToRoad();

        this.monster = new Monster(
            this,
            this.tileSize * 5.5, // 调整怪物初始 X 位置到道路中心
            this.tileSize * 5.5, // 调整怪物初始 Y 位置到道路中心
            'monster'
        );

        // 修改怪物移动定时器
        this.monsterMoveTimer = this.time.addEvent({
            delay: 2000, // 每 2 秒改变一次移动方向
            callback: () => this.changeMonsterDirection(),
            callbackScope: this,
            loop: true
        });

        // 监听键盘事件
        if (this.input.keyboard) {
            this.input.keyboard.on('keydown-SPACE', this.attackMonster, this);
            const cursorKeys = this.input.keyboard.createCursorKeys();
            if (cursorKeys) {
                this.cursors = cursorKeys;
            }
        }

        // 创建动画
        this.anims.create({
            key: 'left',
            frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
            frameRate: 10,
            repeat: 1
        });

        this.anims.create({
            key: 'right',
            frames: this.anims.generateFrameNumbers('player', { start: 4, end: 7 }),
            frameRate: 10,
            repeat: 1
        });

        this.anims.create({
            key: 'up',
            frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
            frameRate: 10,
            repeat: 1
        });

        this.anims.create({
            key: 'down',
            frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
            frameRate: 10,
            repeat: 1
        });

        // 创建攻击动画
        this.anims.create({
            key: this.attackAnimationKey,
            frames: this.anims.generateFrameNumbers('player_attack', { start: 0, end: 4 }),
            frameRate: 10,
            repeat: 1
        });

        // 创建碰撞检测
        this.physics.add.collider(this.player.sprite, this.monster.sprite, () => {
            this.isColliding = true;
        }, undefined, this);
    }

    private createRoadSystem(): void {
        // 定义道路布局，调整布局以适应新的 tileSize
        const roadLayout: RoadLayout[] = [
            // 水平道路 - 减少长度以适应新的 tileSize
            { x: 0, y: 2, type: 'horizontal', length: 10 },
            { x: 0, y: 5, type: 'horizontal', length: 10 },
            { x: 0, y: 8, type: 'horizontal', length: 10 },

            // 垂直道路 - 减少长度以适应新的 tileSize
            { x: 2, y: 0, type: 'vertical', length: 10 },
            { x: 5, y: 0, type: 'vertical', length: 10 },
            { x: 8, y: 0, type: 'vertical', length: 10 },

            // 交叉点 - 调整位置以适应新的布局
            { x: 2, y: 2, type: 'cross' },
            { x: 2, y: 5, type: 'cross' },
            { x: 2, y: 8, type: 'cross' },
            { x: 5, y: 2, type: 'cross' },
            { x: 5, y: 5, type: 'cross' },
            { x: 5, y: 8, type: 'cross' },
            { x: 8, y: 2, type: 'cross' },
            { x: 8, y: 5, type: 'cross' },
            { x: 8, y: 8, type: 'cross' },
        ];

        // 创建道路瓦片
        roadLayout.forEach(road => {
            if ((road.type === 'horizontal' || road.type === 'vertical') && road.length) {
                for (let i = 0; i < road.length; i++) {
                    const x = road.x + (road.type === 'horizontal' ? i : 0);
                    const y = road.y + (road.type === 'vertical' ? i : 0);
                    this.createRoadTile(x, y, road.type);
                }
            } else {
                this.createRoadTile(road.x, road.y, road.type);
            }
        });
    }

    private createRoadTile(x: number, y: number, type: 'horizontal' | 'vertical' | 'corner' | 'cross'): void {
        const worldX = x * this.tileSize;
        const worldY = y * this.tileSize;

        let textureKey = '';
        switch (type) {
            case 'horizontal':
                textureKey = 'road_horizontal';
                break;
            case 'vertical':
                textureKey = 'road_vertical';
                break;
            case 'corner':
                textureKey = 'road_corner';
                break;
            case 'cross':
                textureKey = 'road_cross';
                break;
        }

        const sprite = this.add.image(worldX, worldY, textureKey);
        sprite.setOrigin(0, 0);
        sprite.setDepth(0); // 确保道路在最底层

        this.roadTiles.push({
            x: worldX,
            y: worldY,
            type,
            sprite
        });
    }

    private adjustPlayerToRoad(): void {
        // 找到最近的道路点
        let nearestRoad = this.findNearestRoad(this.player.sprite.x, this.player.sprite.y);
        if (nearestRoad) {
            this.player.sprite.x = nearestRoad.x + this.tileSize / 2;
            this.player.sprite.y = nearestRoad.y + this.tileSize / 2;
        }
    }

    private findNearestRoad(x: number, y: number): RoadTile | null {
        let nearest: RoadTile | null = null;
        let minDistance = Infinity;

        for (const road of this.roadTiles) {
            const roadCenterX = road.x + this.tileSize / 2;
            const roadCenterY = road.y + this.tileSize / 2;
            const distance = Phaser.Math.Distance.Between(x, y, roadCenterX, roadCenterY);

            if (distance < minDistance) {
                minDistance = distance;
                nearest = road;
            }
        }

        return nearest;
    }

    private isOnRoad(x: number, y: number): boolean {
        const nearestRoad = this.findNearestRoad(x, y);
        if (!nearestRoad) {
            console.log('nearestRoad is false')
        }
        if (!nearestRoad) return false;

        const roadCenterX = nearestRoad.x + this.tileSize / 2;
        const roadCenterY = nearestRoad.y + this.tileSize / 2;
        const distance = Phaser.Math.Distance.Between(x, y, roadCenterX, roadCenterY);

        // 如果距离小于瓦片大小的一半，认为在道路上
        return distance <= (this.tileSize / 2 + 10);
    }

    attackMonster(): void {
        this.player.attack();

        if (this.isColliding) {
            let damage = this.player.stats.atk - this.monster.stats.def;
            if (damage < 0) {
                damage = 0;
            }

            this.monster.stats.hp -= damage;

            if (this.monster.stats.hp <= 0) {
                this.monster.sprite.destroy();
                console.log('怪物已击败！');
            } else {
                console.log(`怪物受到 ${damage} 点伤害，剩余生命值: ${this.monster.stats.hp}`);
                this.monster.canMove = false;
                // 3 秒后恢复怪物移动能力
                this.time.delayedCall(3000, () => {
                    this.monster.canMove = true;
                }, [], this);
            }
        }

        // 延迟一段时间后换回原来的图片
        this.time.delayedCall(1000, () => {
            this.player.stopAttack();
        }, [], this);
    }

    // 修改获取可用道路方向的方法
    private getAvailableRoadDirections(x: number, y: number, excludeDirection?: { x: number; y: number }): { x: number; y: number }[] {
        const directions: { x: number; y: number }[] = [];
        const currentRoad = this.findNearestRoad(x, y);
        
        if (!currentRoad) return directions;

        // 检查四个方向是否有道路
        const checkPositions = [
            { x: x + this.tileSize, y: y },     // 右
            { x: x - this.tileSize, y: y },     // 左
            { x: x, y: y + this.tileSize },     // 下
            { x: x, y: y - this.tileSize }      // 上
        ];

        checkPositions.forEach((pos, index) => {
            if (this.isOnRoad(pos.x, pos.y)) {
                const dx = (pos.x - x) / this.tileSize;
                const dy = (pos.y - y) / this.tileSize;
                
                // 检查这个方向是否会导致回到最近的位置
                const willReturnToRecentPosition = this.monsterLastPositions.some(lastPos => {
                    const nextX = x + dx * this.tileSize;
                    const nextY = y + dy * this.tileSize;
                    return Math.abs(nextX - lastPos.x) < this.tileSize && 
                           Math.abs(nextY - lastPos.y) < this.tileSize;
                });

                // 如果这个方向不会导致回到最近的位置，或者没有排除方向，则添加这个方向
                if (!willReturnToRecentPosition && 
                    (!excludeDirection || !(dx === -excludeDirection.x && dy === -excludeDirection.y))) {
                    directions.push({ x: dx, y: dy });
                }
            }
        });

        return directions;
    }

    // 添加新方法：找到当前道路的终点
    private findPathEnd(startX: number, startY: number, direction: { x: number; y: number }): { x: number; y: number } | null {
        let currentX = startX;
        let currentY = startY;
        let lastValidPosition = { x: startX, y: startY };
        const maxSteps = 20; // 防止无限循环
        let steps = 0;

        while (steps < maxSteps) {
            const nextX = currentX + direction.x * this.tileSize;
            const nextY = currentY + direction.y * this.tileSize;

            if (!this.isOnRoad(nextX, nextY)) {
                break;
            }

            // 检查是否有其他可用的方向（除了当前方向）
            const otherDirections = this.getAvailableRoadDirections(nextX, nextY, direction);
            if (otherDirections.length > 0) {
                // 如果遇到交叉点，就停在这里
                break;
            }

            currentX = nextX;
            currentY = nextY;
            lastValidPosition = { x: currentX, y: currentY };
            steps++;
        }

        return lastValidPosition;
    }

    // 添加新方法：更新怪物位置记忆
    private updateMonsterPositionMemory(x: number, y: number): void {
        // 将当前位置添加到记忆数组的开头
        this.monsterLastPositions.unshift({ x, y });
        
        // 保持数组长度不超过最大值
        if (this.monsterLastPositions.length > this.MAX_POSITION_MEMORY) {
            this.monsterLastPositions.pop();
        }
    }

    // 修改怪物移动逻辑
    update(time: number, delta: number): void {
        let newX = this.player.sprite.x;
        let newY = this.player.sprite.y;
        let currentDirection: string | null = null;
        this.isMoving = false; // 重置移动状态

        if (this.cursors.left.isDown) {
            newX -= this.speed * (delta / 1000);
            currentDirection = 'left';
            this.isMoving = true;
            this.player.sprite.flipX = true;
        } else if (this.cursors.right.isDown) {
            newX += this.speed * (delta / 1000);
            currentDirection = 'right';
            this.isMoving = true;
            this.player.sprite.flipX = false;
        }

        if (this.cursors.up.isDown) {
            newY -= this.speed * (delta / 1000);
            currentDirection = 'up';
            this.isMoving = true;
        } else if (this.cursors.down.isDown) {
            newY += this.speed * (delta / 1000);
            currentDirection = 'down';
            this.isMoving = true;
        }

        if (!this.isMoving) {
            console.log('cursors:', this.cursors)
        }
        console.log('isMoving:', this.isMoving);
        if (this.isMoving) {
            // 检查是否在道路上
            const willBeOnRoad = this.isOnRoad(newX, newY);
            if (!willBeOnRoad) {
                console.log(`尝试移动到 (${Math.floor(newX)}, ${Math.floor(newY)}) - 不在道路上，尝试限制移动`);
                // 如果不在道路上，尝试只移动一个轴
                if (currentDirection === 'left' || currentDirection === 'right') {
                    if (this.isOnRoad(newX, this.player.sprite.y)) {
                        console.log('允许水平移动');
                    } else {
                        console.log('阻止水平移动');
                        newX = this.player.sprite.x;
                        this.isMoving = false; // 如果移动被阻止，更新移动状态
                    }
                } else if (currentDirection === 'up' || currentDirection === 'down') {
                    if (this.isOnRoad(this.player.sprite.x, newY)) {
                        console.log('允许垂直移动');
                    } else {
                        console.log('阻止垂直移动');
                        newY = this.player.sprite.y;
                        this.isMoving = false; // 如果移动被阻止，更新移动状态
                    }
                }
            } else {
                console.log(`移动到 (${Math.floor(newX)}, ${Math.floor(newY)}) - 在道路上，允许移动`);
            }
        }

        // 检查是否发生碰撞
        if (this.isColliding) {
            if (currentDirection && this.lastDirection && currentDirection !== this.lastDirection) {
                this.isColliding = false;
            } else {
                newX = this.player.sprite.x;
                newY = this.player.sprite.y;
                this.isMoving = false; // 如果发生碰撞，更新移动状态
            }
        }

        if (this.isMoving) {
            this.lastDirection = currentDirection;
            if (currentDirection) {
                this.player.sprite.anims.play(currentDirection, true);
            }
        } else {
            // 如果不在移动，停止动画
            this.player.sprite.anims.stop();
        }

        // 更新玩家位置
        this.player.sprite.x = newX;
        this.player.sprite.y = newY;

        // 检查怪物是否与玩家碰撞
        const isMonsterColliding = Phaser.Geom.Intersects.RectangleToRectangle(
            this.monster.sprite.getBounds(),
            this.player.sprite.getBounds()
        );

        if (isMonsterColliding) {
            this.monster.findNewDirection(this.player.sprite);
        }

        // 更新怪物位置
        if (this.monster.canMove) {
            const currentX = this.monster.sprite.x;
            const currentY = this.monster.sprite.y;

            // 如果怪物不在道路上，将其调整到最近的道路点
            if (!this.isOnRoad(currentX, currentY)) {
                const nearestRoad = this.findNearestRoad(currentX, currentY);
                if (nearestRoad) {
                    this.monster.sprite.x = nearestRoad.x + this.tileSize / 2;
                    this.monster.sprite.y = nearestRoad.y + this.tileSize / 2;
                    // 重置路径终点和位置记忆
                    this.monsterPathEnd = null;
                    this.monsterLastPositions = [];
                }
            }

            // 如果没有目标路径终点，或者已经到达终点，选择新的路径
            if (!this.monsterPathEnd || 
                (Math.abs(this.monster.sprite.x - this.monsterPathEnd.x) < 5 && 
                 Math.abs(this.monster.sprite.y - this.monsterPathEnd.y) < 5)) {
                
                const availableDirections = this.getAvailableRoadDirections(
                    this.monster.sprite.x,
                    this.monster.sprite.y
                );

                if (availableDirections.length > 0) {
                    // 随机选择一个方向
                    const randomIndex = Phaser.Math.Between(0, availableDirections.length - 1);
                    this.monster.moveDirection = availableDirections[randomIndex];
                    
                    // 找到这条路径的终点
                    this.monsterPathEnd = this.findPathEnd(
                        this.monster.sprite.x,
                        this.monster.sprite.y,
                        this.monster.moveDirection
                    );

                    // 更新位置记忆
                    this.updateMonsterPositionMemory(this.monster.sprite.x, this.monster.sprite.y);
                } else {
                    this.monster.moveDirection = { x: 0, y: 0 };
                    this.monsterPathEnd = null;
                    // 清空位置记忆，允许重新探索
                    this.monsterLastPositions = [];
                }
            }

            // 根据方向移动怪物
            const monsterDx = this.monster.moveDirection.x * this.monster.speed * (delta / 1000);
            const monsterDy = this.monster.moveDirection.y * this.monster.speed * (delta / 1000);

            const newMonsterX = this.monster.sprite.x + monsterDx;
            const newMonsterY = this.monster.sprite.y + monsterDy;

            // 确保新位置在道路上
            if (this.isOnRoad(newMonsterX, newMonsterY)) {
                this.monster.sprite.x = newMonsterX;
                this.monster.sprite.y = newMonsterY;
                // 更新位置记忆
                this.updateMonsterPositionMemory(newMonsterX, newMonsterY);
            } else {
                // 如果无法继续移动，重置路径终点和位置记忆
                this.monsterPathEnd = null;
                this.monsterLastPositions = [];
            }
        }
    }

    // 修改怪物改变方向的方法
    private changeMonsterDirection(): void {
        if (!this.monster.canMove) return;
        
        // 重置路径终点和位置记忆
        this.monsterPathEnd = null;
        this.monsterLastPositions = [];
    }

    getDirectionFromKeys(): string | null {
        if (this.cursors.left.isDown) {
            return 'left';
        } else if (this.cursors.right.isDown) {
            return 'right';
        } else if (this.cursors.up.isDown) {
            return 'up';
        } else if (this.cursors.down.isDown) {
            return 'down';
        }
        return null;
    }
}

export default GameScene;