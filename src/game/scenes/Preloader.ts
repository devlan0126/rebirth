import { Scene } from 'phaser';

export class Preloader extends Scene {
    constructor() {
        super('Preloader');
    }

    init() {
        //  We loaded this image in our Boot Scene, so we can display it here
        // this.add.image(512, 384, 'background');

        //  A simple progress bar. This is the outline of the bar.
        this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);

        //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
        const bar = this.add.rectangle(512 - 230, 384, 4, 28, 0xffffff);

        //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
        this.load.on('progress', (progress: number) => {

            //  Update the progress bar (our bar is 464px wide, so 100% = 464px)
            bar.width = 4 + (460 * progress);

        });
    }

    preload() {
        //  Load the assets for the game - Replace with your own assets
        this.load.setPath('assets');

        // this.load.image('player', 'Knight_male/Protect.png');
        this.load.spritesheet('player', 'Knight_male/Run.png', {
            frameWidth: 70, // 每个帧的宽度
            frameHeight: 85 // 每个帧的高度
        });
        this.load.spritesheet('player_attack', 'Knight_male/Attack 1.png', {
            frameWidth: 80, // 每个帧的宽度
            frameHeight: 85 // 每个帧的高度
        });
        
        // 加载道路图片
        this.load.image('road_horizontal', 'road/horizontal.png');
        this.load.image('road_vertical', 'road/vertical.png');
        this.load.image('road_corner', 'road/corner.png');
        this.load.image('road_cross', 'road/cross.png');
        
        this.load.image('monster', 'monster/PNG/Wraith_01/PNG Sequences/Walking/Wraith_01_Moving Forward_000.png');

        console.count('Preloader preload');
    }

    create() {
        //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
        //  For example, you can define global animations here, so we can use them in other scenes.

        //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
        this.scene.start('MainMenu');
    }
}
