import type {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import type {CompositeNavigationProp, RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {ROUTES} from '../constants/routes';
import type {TransactionItem} from '../services/transaction';

export type RootStackParamList = {
  [ROUTES.home]: undefined;
  [ROUTES.add]: undefined;
  [ROUTES.bookManage]: undefined;
  [ROUTES.receipt]: {initialImageUri?: string} | undefined;
  [ROUTES.transactionDetail]: {transaction: TransactionItem};
};

export type MainTabParamList = {
  [ROUTES.detail]: undefined;
  [ROUTES.chart]: undefined;
  [ROUTES.addPlaceholder]: undefined;
  [ROUTES.discover]: undefined;
  [ROUTES.profile]: undefined;
};

export type RootStackNavigationPropType<
  RouteName extends keyof RootStackParamList = keyof RootStackParamList,
> = NativeStackNavigationProp<RootStackParamList, RouteName>;

export type MainTabNavigationProp<
  RouteName extends keyof MainTabParamList = keyof MainTabParamList,
> = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, RouteName>,
  RootStackNavigationPropType
>;

export type ReceiptRouteProp = RouteProp<RootStackParamList, typeof ROUTES.receipt>;
export type TransactionDetailRouteProp = RouteProp<
  RootStackParamList,
  typeof ROUTES.transactionDetail
>;
