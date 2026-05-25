from yacs.config import CfgNode

config = CfgNode()

config.MODEL_PATHS = CfgNode()
config.MODEL_PATHS.RGB_PRETRAINED = r"beta_models\model_rgb.pth"
config.MODEL_PATHS.C3D_PRETRAINED = r"beta_models\C3D_Sport1M.pth"
config.MODEL_PATHS.TRAINED_UCF_RGB = r"checkpoints\UCF_I3D_AUC_0.85989.pth"

config.DATA_PATHS = CfgNode()
config.DATA_PATHS.SPATIAL_ANNOTATIONS = r"data_injestions\Test_Spatial_Annotation.npy"
config.DATA_PATHS.TRAIN_FRAMES = r"data_injestions\compression\UCFCrime-Frames-train.h5"
config.DATA_PATHS.TEST_FRAMES = r"data_injestions\compression\UCFCrime-Frames-test.h5"
config.DATA_PATHS.TEMPORAL_ANNOTATIONS = (
    r"data_injestions\temporal_anomaly_annotation.txt"
)

config.DATASET = CfgNode()
config.DATASET.RGB_MEAN = [0.45, 0.45, 0.45]
config.DATASET.RGB_STD = [0.225, 0.225, 0.225]
config.DATASET.CROP_SIZE = 224
config.DATASET.RESIZE = 256
config.DATASET.C3D_MEAN = [90.25, 97.66, 101.41]
config.DATASET.C3D_STD = [1, 1, 1]

config.TRAINING = CfgNode()
config.TRAINING.SEED = 0

config.DIRS = CfgNode()
config.DIRS.LOGS = "./loggings/"
config.DIRS.CHECKPOINTS = "./checkpoints/"


def create_directories(paths):
    import os

    for path in paths:
        if not os.path.exists(path):
            os.makedirs(path)


create_directories(
    [
        config.DIRS.LOGS,
        config.DIRS.SUMMARIES,
        config.DIRS.CHECKPOINTS,
        config.DIRS.VISUALIZATIONS,
    ]
)
