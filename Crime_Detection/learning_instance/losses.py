import sys
import os
import math
import random
import copy

import torch
from torch import Tensor
import torch.nn as nn
import torch.nn.functional as F
import torch.autograd as autograd
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torch.cuda import amp
import torch.backends.cudnn as cudnn

sys.path.append("..")
import torch.nn.functional as F


class Weighted_BCE_Loss(nn.Module):
    def __init__(self, weights, label_smoothing=0, eps=1e-8):
        super(Weighted_BCE_Loss, self).__init__()
        self.weights = weights
        self.eps = eps
        self.label_smoothing = label_smoothing
        # self.gamma=gamma

    def forward(self, scores, targets):
        new_targets = F.hardtanh(
            targets, self.label_smoothing, 1 - self.label_smoothing
        )
        return torch.mean(
            -self.weights[0] * new_targets * torch.log(scores + self.eps)
            - self.weights[1] * (1 - new_targets) * torch.log(1 - scores + self.eps)
        )
