import ERC20 from '../configs/ABIs/ERC20.json' assert { type: 'json' };
import ERC721 from '../configs/ABIs/ERC721.json' assert { type: 'json' };
import FactoryForkUniswapV2ABI from '../configs/ABIs/FactoryForkUniswapV2ABI.json' assert { type: 'json' };
import LCR from '../configs/ABIs/LCR.json' assert { type: 'json' };
import LCROperator from '../configs/ABIs/LCROperator.json' assert { type: 'json' };
import LCRRouter02 from '../configs/ABIs/LCRRouter02.json' assert { type: 'json' };
import BLCRPair from '../configs/ABIs/BLCRPair.json' assert { type: 'json' };
import MultiTransferABI from '../configs/ABIs/MultiTransfer.json' assert { type: 'json' };
import PointABI from '../configs/ABIs/Point.json' assert { type: 'json' };
import RouterForUniswapV2ABI from '../configs/ABIs/RouterForkUniswapV2ABI.json' assert { type: 'json' };

export const ABIS = {
  ROUTER_FORK_UNIV2: RouterForUniswapV2ABI,
  FACTORY_FORK_UNIV2: FactoryForkUniswapV2ABI,
  ERC20,
  ERC721,
  MultiTransferABI,
  PointABI,
  LCRRouter02,
  LCROperator,
  BLCRPair,
  LCR,
};

export const getBySymbolABI = symbol => {
  try {
    symbol = typeof symbol != 'string' ? symbol?.toString() : symbol;
    if (!ABIS[symbol]) throw 'ABI corresponds to symbol not found';
    return ABIS[symbol];
  } catch (error) {
    console.log(error);
    return false;
  }
};
