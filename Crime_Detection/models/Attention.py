import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
import torch.autograd as autograd

from torch import Tensor
from torch.autograd import Variable, grad, Function
from torch.nn import Parameter, ModuleList, Sequential, BatchNorm1d, BatchNorm2d, BatchNorm3d
from torch.nn.utils import clip_grad_norm_, clip_grad_value_, spectral_norm, weight_norm, rnn

from torch.utils.data import (
    DataLoader,
    Dataset,
    TensorDataset,
    ConcatDataset,
    random_split,
    Subset,
    DistributedSampler,
)

from torch.optim import (
    Adam,
    SGD,
    RMSprop,
    AdamW,
    Adagrad,
    lr_scheduler,
)

from torch.cuda import amp
from torch.cuda.amp import autocast, GradScaler
import torch.cuda as cuda
import torch.backends.cudnn as cudnn

import torch.distributions as distributions
from torch.distributions import Categorical, Normal, Bernoulli, MultivariateNormal

import torch.jit as jit
from torch.jit import script, trace

import torch.onnx as onnx
from torch.onnx import export

import torch.distributed as dist
import torch.multiprocessing as mp
from torch.nn.parallel import DistributedDataParallel as DDP
from torch.nn.parallel import DataParallel

import torch.hub
# import torchvision

import copy



class Self_Guided_Attention_Branch_Module(nn.Module):
    def __init__(self, in_channels, expand_k, out_t_channels):
        super(Self_Guided_Attention_Branch_Module, self).__init__()
        self.in_channels = in_channels
        self.num_headers = 2 * expand_k

        if out_t_channels == 4:
            self.Conv_Atten = nn.Sequential(
                nn.Conv3d(
                    in_channels,
                    self.in_channels,
                    kernel_size=(3, 3, 3),
                    stride=(1, 2, 2),
                    padding=(1, 1, 1),
                ),
                nn.ReLU(),
            )
        elif out_t_channels == 2:
            self.Conv_Atten = nn.Sequential(
                nn.Conv3d(
                    in_channels,
                    self.in_channels,
                    kernel_size=(3, 3, 3),
                    stride=(1, 2, 2),
                    padding=(0, 1, 1),
                ),
                nn.ReLU(),
            )

        self.Att_1 = nn.Sequential(
            nn.Conv3d(in_channels, self.num_headers, kernel_size=(1, 1, 1)), nn.ReLU()
        )
        self.Att_2 = nn.Conv3d(
            self.num_headers, self.num_headers, kernel_size=(1, 1, 1)
        )
        self.GAP = nn.AdaptiveAvgPool3d(1)
        self.Softmax = nn.Softmax(dim=-1)

        self.Att_3 = nn.Sequential(
            nn.Conv3d(self.num_headers, 1, kernel_size=(out_t_channels, 1, 1)),
            nn.Sigmoid(),
        )

    def forward(self, x):
        b, c, t, h, w = x.shape
        feat_map = self.Conv_Atten(x)
        feat_map = self.Att_1(feat_map)
        # att_scores=self.Softmax(self.GAP(self.Att_2(feat_map)).squeeze(-1).squeeze(-1).squeeze(-1).view(feat_map.shape[0],2,-1).mean(dim=-1))
        att_scores = (
            self.GAP(self.Att_2(feat_map))
            .squeeze(-1)
            .squeeze(-1)
            .squeeze(-1)
            .view(feat_map.shape[0], 2, -1)
            .mean(dim=-1)
        )
        att_map = self.Att_3(feat_map)
        return att_map, att_scores, feat_map
