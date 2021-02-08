import { formatUnits } from '@ethersproject/units';
import { BigNumber } from '@ethersproject/bignumber';
import { multicall } from '../../utils';

const BIG6 = BigNumber.from('1000000');
const BIG18 = BigNumber.from('1000000000000000000');

const UNISWAP_SUBGRAPH_URL = {
  '1': 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2'
};


export const author = 'FraxFinance';
export const version = '0.0.1';

const DECIMALS = 18;

const abi = [
  {
    constant: true,
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address'
      }
    ],
    name: 'balanceOf',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256'
      }
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function'
  },
  {
    "inputs": [],
    "name": "getReserves",
    "outputs": [
      {
        "internalType": "uint112",
        "name": "_reserve0",
        "type": "uint112"
      },
      {
        "internalType": "uint112",
        "name": "_reserve1",
        "type": "uint112"
      },
      {
        "internalType": "uint32",
        "name": "_blockTimestampLast",
        "type": "uint32"
      }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
  },
  {
    "inputs": [],
    "name": "token0",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

const chunk = (arr, size) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
    arr.slice(i * size, i * size + size)
  );

export async function strategy(
  space,
  network,
  provider,
  addresses,
  options,
  snapshot
) {
  const blockTag = typeof snapshot === 'number' ? snapshot : 'latest';

  // Fetch FXS Balance
  const fxsQuery = addresses.map((address: any) => [
    options.FXS,
    'balanceOf',
    [address]
  ]);

  // Fetch FREE_UNI_LP_FRAX_FXS Balance
  const freeUniLPFraxFxsQuery = addresses.map((address: any) => [
    options.UNI_LP_FRAX_FXS,
    'balanceOf',
    [address]
  ]);

  // Fetch FARMING_UNI_LP_FRAX_FXS Balance
  const farmingUniLPFraxFxsQuery = addresses.map((address: any) => [
    options.FARMING_UNI_LP_FRAX_FXS,
    'balanceOf',
    [address]
  ]);

  const response = await multicall(
    network,
    provider,
    abi,
    [
      // Get 1inch LP OPIUM-ETH balance of OPIUM
      // [options.OPIUM, 'balanceOf', [options.LP_1INCH_OPIUM_ETH]],
      [options.UNI_LP_FRAX_FXS, 'token0'],
      [options.UNI_LP_FRAX_FXS, 'getReserves'],
      [options.UNI_LP_FRAX_FXS, 'totalSupply'],
      ...fxsQuery,
      ...freeUniLPFraxFxsQuery,
      ...farmingUniLPFraxFxsQuery,

    ],
    { blockTag }
  );


  const uniLPFraxFxs_token0 = response[0];
  const uniLPFraxFxs_getReserves = response[1];
  const uniLPFraxFxs_totalSupply = response[2];

  console.log("uniLPFraxFxs_token0: ", uniLPFraxFxs_token0[0]);
  console.log("uniLPFraxFxs_getReserves[0]: ", uniLPFraxFxs_getReserves[0]);
  console.log("uniLPFraxFxs_getReserves[1]: ", uniLPFraxFxs_getReserves[1]);
  console.log("uniLPFraxFxs_totalSupply: ", uniLPFraxFxs_totalSupply[0]);

  let uniLPFraxFxs_fxs_per_LP_E18;
  if (uniLPFraxFxs_token0[0] == options.FXS) {
    const uni_FraxFxs_totalSupply_E0 = uniLPFraxFxs_totalSupply[0];
    const uni_FraxFxs_reserves0_E0 = uniLPFraxFxs_getReserves[0];
    uniLPFraxFxs_fxs_per_LP_E18 = uni_FraxFxs_reserves0_E0.mul(BIG18).div(uni_FraxFxs_totalSupply_E0);
  }

  const responseClean = response.slice(3, response.length);

  const chunks = chunk(responseClean, addresses.length);
  const fxsBalances = chunks[0];
  const freeUniFraxFxsBalances = chunks[1];
  const farmUniFraxFxsBalances = chunks[2];
  // const lp1inchOpiumEthBalances = chunks[2];
  // const farmingLp1inchOpiumEthBalances = chunks[3];

  // return Object.fromEntries(
  //   Array(addresses.length)
  //     .fill('x')
  //     .map((_, i) => [
  //       addresses[i],
  //       parseFloat(
  //         formatUnits(
  //           // OPIUM
  //           fxsBalances[i][0]
  //             // wOPIUM
  //             .add(farmUniFraxFxsBalances[i][0])
  //             // LP 1inch OPIUM-ETH + farming
  //             .add(
  //               opiumLp1inchOpiumEth[0]
  //                 .mul(
  //                   lp1inchOpiumEthBalances[i][0].add(
  //                     farmingLp1inchOpiumEthBalances[i][0]
  //                   )
  //                 )
  //                 .div(opiumLp1inchOpiumEthTotalSupply[0])
  //             )
  //             .toString(),
  //           DECIMALS
  //         )
  //       )
  //     ])
  // );
  return Object.fromEntries(
    Array(addresses.length)
      .fill('x')
      .map((_, i) => [
        addresses[i],
        parseFloat(
          formatUnits(
            fxsBalances[i][0]
            .add((freeUniFraxFxsBalances[i][0]).mul(uniLPFraxFxs_fxs_per_LP_E18).div(BIG18)) // FXS share in the free Uni FRAX/FXS LP
            .add((farmUniFraxFxsBalances[i][0]).mul(uniLPFraxFxs_fxs_per_LP_E18).div(BIG18)) // FXS share in the staked Uni FRAX/FXS LP
            
            
            .toString(),
            DECIMALS
          )
        )
      ])
  );
}
